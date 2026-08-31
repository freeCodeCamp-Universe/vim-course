import {
  SHELL_PROMPT,
  enterAnimation,
  getLine,
  getVirtualFile,
  splashText,
  visualSelection,
  type EditorState,
  type QuickfixList,
} from '@/engine';
import { dispatchPaste, QUICKFIX_PAGER_HINT } from '@/engine/dispatch';
import { centerText } from '@/terminal/centerText';
import { textLength, textSlice } from '@/engine/text';
import type { DecorationRange } from '@/curriculum/decorations';
import { vimLessonEngine, type LessonEngine } from '@/curriculum/lessonEngine';
import {
  createLessonProgress,
  regradeProgress,
  settleChecklistAttempts,
  type ChecklistItem,
} from '@/curriculum/lessonProgress';
import { isProseLesson, type DecorativeRange, type LessonDefinition } from '@/curriculum/types';
import { parseNeedleRegex } from '@/curriculum/needle';
import { createFrameLoop, type FrameLoop } from '@/animation/frameLoop';
import { getScene } from '@/animation/scenes';
import {
  createTerminalView,
  type Decoration,
  type LineRole,
  type TerminalRange,
  type TerminalViewModel,
} from './terminalView';

/**
 * The slice of the lesson runtime the React sidebar renders. The terminal owns
 * the engine state; this is everything else a keystroke can change that lives
 * outside the grid, pushed up on every advance so the checklist, primary control,
 * and Reset button track the terminal without a state prop threading back down.
 */
export interface LessonSnapshot {
  checklist: readonly ChecklistItem[];
  complete: boolean;
  /** Whether the active buffer has diverged from its seed, for the Reset control. */
  dirty: boolean;
  /** True when there is anything to reset: dirty buffer OR shell output accumulated. */
  resettable: boolean;
}

function targetLineValue(line: string, targetLine: string): string | null {
  const regex = parseNeedleRegex(targetLine);
  if (regex) {
    const match = line.match(new RegExp(regex.source, regex.flags));
    return match?.index === undefined ? null : line.slice(match.index + match[0].length).trim();
  }
  const index = line.indexOf(targetLine);
  return index === -1 ? null : line.slice(index + targetLine.length).trim();
}

export interface VimTerminalViewOptions {
  lesson: LessonDefinition;
  /** Called with a fresh snapshot after every advance, reset, and incomplete grade. */
  onUpdate: (snapshot: LessonSnapshot) => void;
  /** The engine to drive; defaults to Vim's. Injectable for tests. */
  engine?: LessonEngine<EditorState>;
  accessibleName?: string;
}

/**
 * The state-owning terminal handle. It holds the lesson's engine state and calls
 * the progress controller itself, so a keystroke repaints the grid synchronously
 * with React out of the loop, then pushes a snapshot up for the sidebar. React
 * appends {@link el} once and never reconciles the terminal subtree — the focus,
 * selection, and live region live where reconciliation must never reach.
 */
export interface VimTerminalView {
  readonly el: HTMLDivElement;
  /** Move focus to the terminal; returns false when it is off screen (hidden tab). */
  focus(): boolean;
  /** Restore the pristine seed and checklist, then refocus the terminal. */
  reset(): void;
  /** Grade every open item as a miss and return the line explaining what is left. */
  reportIncomplete(): string;
  /** Tear down the DOM and its listeners (StrictMode remounts, navigation). */
  destroy(): void;
}

/** Which overlay screens auto-center their content within the terminal width. */
const AUTO_CENTER = {
  splash: true,
  shell: false,
  animation: true,
};

const MODE_LABELS: Partial<Record<EditorState['mode'], string>> = {
  insert: '-- INSERT --',
  visual: '-- VISUAL --',
  'visual-line': '-- VISUAL LINE --',
};

/** The status-line message: an error/status takes precedence, then the mode. */
function statusMessage(
  state: EditorState,
  rows: number
): {
  text: string;
  isHint: boolean;
} {
  if (state.mode === 'shell') {
    return { text: `${SHELL_PROMPT}${state.shell?.input ?? ''}`, isHint: false };
  }
  if (state.status) {
    return { text: state.status, isHint: state.status === QUICKFIX_PAGER_HINT };
  }
  if (state.mode === 'command-line') {
    // While waiting for a register name, show `"` at the cursor position in
    // the command line, matching Vim's visual indicator that it's expecting a
    // register designator after Ctrl-r.
    if (state.commandLineRegisterPending) {
      const cursor = state.commandLineCursor;
      return {
        text:
          state.commandLinePrompt +
          textSlice(state.commandLine, 0, cursor) +
          '"' +
          textSlice(state.commandLine, cursor),
        isHint: false,
      };
    }
    return { text: `${state.commandLinePrompt}${state.commandLine}`, isHint: false };
  }
  if (state.quickfixListing && state.quickfix) {
    // One row is reserved for the status line footer, so `rows - 1` entries fit.
    const visibleRows = Math.max(1, rows - 1);
    const totalEntries = state.quickfix.entries.length;
    if (totalEntries <= visibleRows) {
      // Short list: all entries fit — Vim's "Press ENTER" prompt.
      return { text: 'Press ENTER or type command to continue', isHint: true };
    }
    // Long list: show "-- More --" while more entries are below the current view.
    const hasMore = state.quickfixScrollOffset + visibleRows < totalEntries;
    return { text: hasMore ? '-- More --' : '', isHint: hasMore };
  }
  return { text: MODE_LABELS[state.mode] ?? '', isHint: false };
}

/** The pending command keys (count + operator + text-object prefix). */
function pendingKeys(state: EditorState): string {
  return `${state.pendingCount}${state.pendingOperator ?? ''}${state.pendingTextObject ?? ''}`;
}

function visualSelectionCount(
  state: EditorState,
  visual: NonNullable<ReturnType<typeof visualSelection>>
): number {
  if (state.mode === 'visual-line') {
    return visual.end.line - visual.start.line + 1;
  }
  let count = 0;
  for (let line = visual.start.line; line <= visual.end.line; line++) {
    const length = textLength(getLine(state.buffer, line));
    const from = line === visual.start.line ? visual.start.col : 0;
    const to = line === visual.end.line ? visual.end.col : Math.max(0, length - 1);
    count += Math.max(1, to - from + 1);
  }
  return count;
}

/**
 * A small rendering of the freeCodeCamp flame mark, drawn above the shell
 * prompt while Vim has not been launched. Braille Unicode dot-matrix
 * characters (each cell packs a 2x4 grid of dots) give a thin, detailed line at
 * terminal scale, the same technique tools like `chafa` use for terminal
 * images. Like the splash, this is only ever a picture: the engine holds no
 * notion of it, so it never reaches `state.buffer` or any lesson's content
 * checks.
 */
const SHELL_LOGO: string[] = [
  // 9 rows
  // '  ⠀⠀⢠⣶⠟⠀⠀⠀⠀⠀⠀⠀⣄⠀⠀⠀⠀⠀⠀⠀⠀⠻⣷⡄⠀⠀',
  // '  ⠀⣰⡿⠃⠀⠀⠀⠀⠀⠀⠀⢀⣿⣷⡄⠀⠀⠀⠀⠀⠀⠀⠘⢿⣆⠀',
  // '  ⣰⣿⠁⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣿⡄⠀⠀⠀⠀⠀⠀⠀⠈⣿⣆',
  // '  ⣿⡇⠀⠀⠀⠀⠀⠀⠀⢀⣼⣿⣿⢿⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿',
  // '  ⣿⡇⠀⠀⠀⠀⠀⠀⢠⣾⣿⣿⠋⢸⣿⣥⣾⡄⠀⠀⠀⠀⠀⠀⢸⣿',
  // '  ⣿⣇⠀⠀⠀⠀⠀⠀⣿⣿⡿⠃⠀⢸⣿⣿⣿⣿⠀⠀⠀⠀⠀⠀⣸⣿',
  // '  ⠸⣿⡄⠀⠀⠀⠀⠀⣿⣿⠃⠀⠀⠈⠻⠿⢿⡿⠀⠀⠀⠀⠀⢠⣿⠇',
  // '  ⠀⠹⣿⣄⠀⠀⠀⠀⠘⢿⠀⠀⠀⠀⠀⢀⡞⠁⠀⠀⠀⠀⣠⣿⠏⠀',
  // '  ⠀⠀⠘⢿⣷⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣾⡿⠃⠀⠀',

  // 7 rows
  // '⠀⠀⢀⣴⠆⠀⠀⠀⠀⠀⠀⣀⠀⠀⠀⠀⠀⠀⠀⠰⣦⡀⠀⠀',
  // '⠀⢠⡿⠁⠀⠀⠀⠀⠀⠀⠀⣿⣷⡀⠀⠀⠀⠀⠀⠀⠈⢿⡄⠀',
  // '⢠⣿⠁⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣷⠀⠀⠀⠀⠀⠀⠀⠈⣿⡄',
  // '⢸⡇⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣿⣿⠇⠀⠀⠀⠀⠀⠀⠀⢸⡇',
  // '⢸⡇⠀⠀⠀⠀⠀⠀⣼⣿⣿⠏⢸⣿⣴⣷⡀⠀⠀⠀⠀⠀⢸⡇',
  // '⢸⣇⠀⠀⠀⠀⠀⢸⣿⣿⠃⠀⢸⣿⣿⣿⡇⠀⠀⠀⠀⠀⢸⡇',
  // '⠈⣿⡀⠀⠀⠀⠀⢸⣿⡇⠀⠀⠈⠛⠛⣿⠇⠀⠀⠀⠀⢀⣿⠁',
  // '⠀⠘⣷⡄⠀⠀⠀⠀⠻⡇⠀⠀⠀⠀⢠⠏⠀⠀⠀⠀⢠⣾⠃⠀',
  // '⠀⠀⠈⠻⠆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠰⠟⠁⠀⠀',

  // 5 rows
  '⠀⣠⠞⠁⠀⠀⠀⣄⠀⠀⠀⠈⠳⣄⠀',
  '⣰⠇⠀⠀⠀⠀⣼⣿⣷⠀⠀⠀⠀⠸⣆',
  '⣿⠀⠀⠀⢠⣾⡿⠉⣿⣴⡄⠀⠀⠀⣿',
  '⠸⣆⠀⠀⢸⡟⠀⠀⠻⢿⡇⠀⠀⣰⠇',
  '⠀⠙⢦⡀⠀⠁⠀⠀⠀⠊⠀⢀⡴⠋⠀',
  '',
];

/** The number of braille art rows in SHELL_LOGO (excludes the trailing blank separator). */
const SHELL_LOGO_ART_COUNT = 5;

/**
 * One `:clist` row, in Vim's `{n} {file}:{line} col {col}: {text}` shape.
 * Line and column are shown 1-based. `offset` is the first visible entry index
 * (0-based); `maxRows` caps how many lines are rendered so they fit above the
 * status-line footer.
 */
function quickfixRendering(
  list: QuickfixList,
  offset: number,
  maxRows: number
): { lines: string[]; decorations: Decoration[] } {
  const lines: string[] = [];
  const decorations: Decoration[] = [];
  const visible = list.entries.slice(offset, offset + maxRows);
  for (const [sliceIndex, entry] of visible.entries()) {
    const entryNumber = offset + sliceIndex + 1;
    const rowIndex = sliceIndex;
    const prefix = `${entryNumber} `;
    const filename = `${entry.path}:`;
    const position = `${entry.line + 1} col ${entry.col + 1}:`;
    lines.push(`${prefix}${filename}${position} ${entry.text.trim()}`);

    // Highlight `{num} {filename}:` in qf-location color (entry number and filename)
    decorations.push({
      range: {
        start: { line: rowIndex, col: 0 },
        end: { line: rowIndex, col: prefix.length + filename.length },
      },
      variant: 'qf-location',
    });

    // Highlight `{line} col {col}:` in qf-column color (different styling)
    decorations.push({
      range: {
        start: { line: rowIndex, col: prefix.length + filename.length },
        end: { line: rowIndex, col: prefix.length + filename.length + position.length },
      },
      variant: 'qf-column',
    });
  }
  return { lines, decorations };
}

/**
 * What fills the screen: the buffer, the `:clist` quickfix listing drawn over it
 * until the next keystroke, Vim's startup splash drawn over the untouched empty
 * buffer a bare `vim` opens, or the shell's banner above the prompt
 * before Vim has been launched. Each is only ever a picture — the engine keeps
 * the real buffer intact underneath — so none reaches a lesson's content checks.
 */
function terminalLines(
  state: EditorState,
  qf: { lines: string[]; decorations: Decoration[] } | null,
  cols: number,
  rows: number
): string[] {
  if (qf) {
    return qf.lines;
  }
  if (state.splashVisible) {
    return splashText(cols, AUTO_CENTER.splash);
  }
  if (state.mode === 'shell') {
    const logo = AUTO_CENTER.shell
      ? SHELL_LOGO.map((line) => (line === '' ? '' : centerText(line, cols)))
      : SHELL_LOGO;
    const output = state.shell?.output ?? [];
    return [...logo, ...output];
  }

  // A new file that has never been written to disk gets tilde rows below its
  // content, matching Vim's display of a fresh empty buffer. Files already on
  // disk (lesson-seeded or previously saved) render the buffer as-is.
  const activeFile = state.files.get(state.activeFilePath);
  if (activeFile && !activeFile.onDisk) {
    const tildeCount = Math.max(0, rows - state.buffer.length);
    if (tildeCount > 0) {
      return [...state.buffer, ...Array.from({ length: tildeCount }, () => '~')];
    }
  }
  return state.buffer;
}

/**
 * The `:set number` gutter: one right-aligned line number per row, every label
 * padded to the same width so the text column stays put as the count grows.
 * Null where the screen is not file text — the shell prompt, the
 * netrw listing, the startup splash — since Vim numbers file windows only.
 */
function terminalGutter(state: EditorState, totalLines: number): string[] | null {
  if (!state.showLineNumbers) {
    return null;
  }
  if (
    state.mode === 'shell' ||
    state.mode === 'explorer' ||
    state.mode === 'animation' ||
    state.splashVisible ||
    state.quickfixListing
  ) {
    return null;
  }

  const numberWidth = String(state.buffer.length).length;
  const gutter = state.buffer.map((_, index) => String(index + 1).padStart(numberWidth, ' '));
  // Tilde rows beyond the buffer get blank gutter cells so the arrays stay
  // aligned; real Vim does not number them.
  const tildeCount = totalLines - state.buffer.length;
  for (let i = 0; i < tildeCount; i++) {
    gutter.push(' '.repeat(numberWidth));
  }
  return gutter;
}

/** Highlight the current `:clist` row, the selected netrw row, or the visual selection. */
function terminalSelection(
  state: EditorState,
  qf: { lines: string[]; decorations: Decoration[] } | null
): TerminalRange | null {
  if (qf && state.quickfix && state.quickfix.index >= 0) {
    const row = state.quickfix.index - state.quickfixScrollOffset;
    if (row < 0 || row >= qf.lines.length) {
      return null;
    }
    const line = qf.lines[row] ?? '';
    // Highlight only up to and including the filename colon: `N path:` (not the position info)
    const colonIndex = line.indexOf(':');
    if (colonIndex !== -1) {
      return { start: { line: row, col: 0 }, end: { line: row, col: colonIndex + 1 } };
    }
    return { start: { line: row, col: 0 }, end: { line: row, col: line.length } };
  }

  if (state.mode === 'explorer' && state.explorer) {
    const row = state.explorer.selected;
    const length = state.buffer[row]?.length ?? 0;
    return { start: { line: row, col: 0 }, end: { line: row, col: length } };
  }

  const visual = visualSelection(state);
  if (!visual) {
    return null;
  }
  // A visual selection includes the character its far end sits on; a
  // `TerminalRange`'s end column is exclusive.
  return { start: visual.start, end: { line: visual.end.line, col: visual.end.col + 1 } };
}

function toDecorations(ranges: DecorationRange[] | undefined): Decoration[] | undefined {
  if (!ranges || ranges.length === 0) {
    return undefined;
  }
  return ranges.map((range) => ({
    range: {
      start: { line: range.line, col: range.startCol },
      end: { line: range.line, col: range.endCol },
    },
    variant: 'mark' as const,
  }));
}

/**
 * Flatten the Vim engine's `EditorState` into the generic view's model: the
 * bottom status line becomes the footer, netrw's selection becomes a highlighted
 * range, and the shell prompt rides in the footer where the engine places its
 * cursor. This is the one place that knows Vim; the view stays engine-agnostic.
 */
function toModel(
  state: EditorState,
  announcement: string,
  visited: ReadonlySet<string> | null,
  cols: number,
  rows: number,
  animationLines?: string[],
  decorations?: Decoration[],
  decorativeRanges?: DecorativeRange[]
): TerminalViewModel {
  const cursor =
    state.mode === 'command-line' ||
    state.mode === 'animation' ||
    state.mode === 'shell' ||
    state.splashVisible ||
    state.quickfixListing
      ? null
      : state.cursor;

  const isAnimation = state.mode === 'animation' && animationLines !== undefined;
  const showDecorations =
    !state.splashVisible &&
    state.mode !== 'shell' &&
    state.mode !== 'explorer' &&
    state.mode !== 'animation';

  const qfMaxRows = Math.max(1, rows - 1);
  const qf =
    state.quickfixListing && state.quickfix
      ? quickfixRendering(state.quickfix, state.quickfixScrollOffset, qfMaxRows)
      : null;

  const lines = isAnimation ? animationLines : terminalLines(state, qf, cols, rows);
  const visual = visualSelection(state);
  const visualCount = visual ? visualSelectionCount(state, visual) : null;
  const footerPending = pendingKeys(state);
  const footerStatus = statusMessage(state, rows);

  // Compute per-line accessibility roles. Animations and splash use
  // contentHidden (the whole grid is aria-hidden), so lineRoles only matter
  // for shell mode (logo is a described image) and normal mode (tilde rows
  // below end-of-file are decorative).
  let lineRoles: LineRole[] | undefined;
  if (!isAnimation && !state.splashVisible && !qf) {
    if (state.mode === 'shell') {
      lineRoles = lines.map((_, i): LineRole =>
        i < SHELL_LOGO_ART_COUNT ? { role: 'img', label: 'freeCodeCamp logo' } : 'content'
      );
    } else {
      const activeFile = state.files.get(state.activeFilePath);
      const hasTildes = activeFile && !activeFile.onDisk && lines.length > state.buffer.length;
      const hasLessonRanges =
        decorativeRanges && decorativeRanges.some((r) => r.file === state.activeFilePath);

      if (hasTildes || hasLessonRanges) {
        const tildeStart = hasTildes ? state.buffer.length : lines.length;
        lineRoles = lines.map((_, i): LineRole => (i < tildeStart ? 'content' : 'decorative'));

        if (hasLessonRanges) {
          for (const range of decorativeRanges!) {
            if (range.file !== state.activeFilePath) {
              continue;
            }
            const startIdx = range.lines[0] - 1;
            const endIdx = Math.min(range.lines[1] - 1, tildeStart - 1);
            const role: LineRole = range.description
              ? { role: 'img', label: range.description }
              : 'decorative';
            for (let i = startIdx; i <= endIdx; i++) {
              lineRoles[i] = role;
            }
          }
        }
      }
    }
  }

  return {
    lines,
    lineRoles,
    gutter: terminalGutter(state, lines.length),
    cursor,
    cursorStyle: 'block',
    selection: terminalSelection(state, qf),
    selectionStyle: state.mode === 'explorer' ? 'cursor' : 'accent',
    decorations: qf ? qf.decorations : showDecorations ? decorations : undefined,
    visited,
    footerStart: footerStatus.text,
    footerIsError: state.mode !== 'shell' && state.statusIsError && Boolean(state.status),
    footerIsHint: footerStatus.isHint,
    footerEnd: visualCount !== null ? String(visualCount) : '',
    footerEndVisible: Boolean(footerPending) || visualCount !== null,
    footerEndLabel:
      visualCount !== null
        ? state.mode === 'visual-line'
          ? `${visualCount} lines selected`
          : `${visualCount} selected`
        : undefined,
    footerPending: footerPending || undefined,
    footerCursor:
      state.mode === 'shell'
        ? state.cursor.col
        : state.mode === 'command-line'
          ? state.commandLinePrompt.length + state.commandLineCursor
          : null,
    announcement,
    contentHidden: isAnimation || state.splashVisible,
  };
}

/** Default terminal dimensions for scene rendering. */
const SCENE_ROWS = 20;
const SCENE_COLS_FALLBACK = 60;

export function createVimTerminalView(options: VimTerminalViewOptions): VimTerminalView {
  const engine = options.engine ?? vimLessonEngine;
  const controller = createLessonProgress(options.lesson, engine);
  let progress = controller.seed();
  const fileDecorations = !isProseLesson(options.lesson)
    ? options.lesson.fileDecorations
    : undefined;

  const lessonDecorativeRanges = !isProseLesson(options.lesson)
    ? options.lesson.config.decorativeRanges
    : undefined;

  const highlightVisited =
    !isProseLesson(options.lesson) && (options.lesson.config.highlightVisited ?? false);
  let visited: Set<string> | null = highlightVisited ? new Set<string>() : null;
  const pendingAttempts = new Set<number>();
  const attemptTimers = new Map<number, ReturnType<typeof setTimeout>>();

  // Animation frame loop, active only while `state.mode === 'animation'`.
  let activeLoop: FrameLoop | null = null;
  let currentAnimationLines: string[] | undefined;

  /** Record the cursor's current position as visited. */
  function trackVisit(): void {
    if (visited) {
      const { line, col } = progress.state.cursor;
      visited.add(`${line},${col}`);
    }
  }

  /** Start a frame loop for the current animation scene, if one is active. */
  function startLoop(): void {
    stopLoop();
    const anim = progress.state.animation;
    if (progress.state.mode !== 'animation' || !anim) {
      return;
    }
    const entry = getScene(anim.scene);
    if (!entry) {
      // Unknown scene: fall back to rendering the buffer.
      return;
    }
    activeLoop = createFrameLoop({
      scene: entry,
      rows: SCENE_ROWS,
      cols: AUTO_CENTER.animation ? () => view.measureCols() : SCENE_COLS_FALLBACK,
      onFrame(lines, cols) {
        currentAnimationLines = lines;
        view.update(
          toModel(
            progress.state,
            progress.announcement,
            visited,
            cols,
            view.measureRows(),
            currentAnimationLines,
            toDecorations(fileDecorations?.[progress.state.activeFilePath]),
            lessonDecorativeRanges
          )
        );
      },
    });
  }

  /** Stop any running frame loop. */
  function stopLoop(): void {
    if (activeLoop) {
      activeLoop.destroy();
      activeLoop = null;
    }

    currentAnimationLines = undefined;
  }

  function fileLines(state: EditorState, path: string): readonly string[] | null {
    const file = getVirtualFile(state.files, path);
    if (!file) {
      return null;
    }
    if (
      path === state.activeFilePath &&
      state.mode !== 'shell' &&
      state.mode !== 'explorer' &&
      state.mode !== 'animation'
    ) {
      return state.buffer;
    }
    return file.contents;
  }

  function targetLineMatches(line: string, targetLine: string): boolean {
    const regex = parseNeedleRegex(targetLine);
    return regex ? new RegExp(regex.source, regex.flags).test(line) : line.includes(targetLine);
  }

  function clearAttemptTimer(index: number): void {
    const timer = attemptTimers.get(index);
    if (timer !== undefined) {
      clearTimeout(timer);
      attemptTimers.delete(index);
    }
  }

  function scheduleAttempt(index: number): void {
    clearAttemptTimer(index);
    attemptTimers.set(
      index,
      setTimeout(() => {
        attemptTimers.delete(index);
        if (!pendingAttempts.has(index)) {
          return;
        }
        const results = engine.checkRequirements(progress.state, options.lesson, visited);
        progress = settleChecklistAttempts(progress, [index], results);
        pendingAttempts.delete(index);
        emit();
      }, 1000)
    );
  }

  function trackHintAttempts(previous: EditorState, next: EditorState): void {
    if (isProseLesson(options.lesson)) {
      return;
    }
    const changedFiles = new Set<string>();
    for (const [index, requirement] of options.lesson.config.checklist.entries()) {
      if (requirement.attemptsBeforeHint === undefined || requirement.targetLine === undefined) {
        continue;
      }
      const file = requirement.test.file;
      if (file === undefined) {
        continue;
      }
      const before = fileLines(previous, file);
      const after = fileLines(next, file);
      if (!before || !after) {
        continue;
      }
      if (before.join('\n') !== after.join('\n')) {
        changedFiles.add(file);
      }
      const targetIndex = after.findIndex((line) =>
        targetLineMatches(line, requirement.targetLine!)
      );
      const targetChanged = targetIndex !== -1 && before[targetIndex] !== after[targetIndex];
      const targetValue = targetLineValue(after[targetIndex], requirement.targetLine);
      if (targetChanged && targetValue !== null && targetValue.length > 0) {
        pendingAttempts.add(index);
      } else if (targetChanged) {
        pendingAttempts.delete(index);
        clearAttemptTimer(index);
      }
    }
    if (changedFiles.size > 0) {
      for (const index of pendingAttempts) {
        scheduleAttempt(index);
      }
    }
  }

  const view = createTerminalView({
    accessibleName: options.accessibleName ?? 'vim terminal',
    onKey(key) {
      const previousState = progress.state;
      const waAnimating = progress.state.mode === 'animation';
      const wasComplete = progress.complete;
      progress = controller.advance(progress, key, visited, (state) => {
        if (visited) {
          visited.add(`${state.cursor.line},${state.cursor.col}`);
        }
      });
      trackHintAttempts(previousState, progress.state);

      const lessonConfig = !isProseLesson(options.lesson) ? options.lesson.config : null;
      const completionScene = lessonConfig?.completionScene;
      if (
        !waAnimating &&
        !wasComplete &&
        progress.complete &&
        completionScene &&
        !progress.state.completionShown
      ) {
        progress = {
          ...progress,
          state: enterAnimation(progress.state, completionScene, {
            onDismiss: { open: lessonConfig.open },
            isCompletion: true,
          }),
          announcement: 'Capstone complete. Press any key to return to the study.',
        };
      }

      // Transition out of animation mode: stop the loop before rendering.
      if (waAnimating && progress.state.mode !== 'animation') {
        stopLoop();
      }
      // Transition into animation mode: start the loop.
      if (!waAnimating && progress.state.mode === 'animation') {
        startLoop();
      }

      render();
      emit();
    },
    onPaste(text) {
      const previousState = progress.state;
      const result = dispatchPaste(progress.state, text);
      progress = { ...progress, state: result.state, announcement: '' };
      progress = regradeProgress(progress, options.lesson, engine, visited);
      trackHintAttempts(previousState, progress.state);
      render();
      emit();
    },
  });

  function render(): void {
    const cols = view.measureCols();
    const rows = view.measureRows();
    view.update(
      toModel(
        progress.state,
        progress.announcement,
        visited,
        cols,
        rows,
        currentAnimationLines,
        toDecorations(fileDecorations?.[progress.state.activeFilePath]),
        lessonDecorativeRanges
      )
    );
  }

  function snapshot(): LessonSnapshot {
    const shellHasOutput = (progress.state.shell?.output.length ?? 0) > 0;
    return {
      checklist: progress.checklist,
      complete: progress.complete,
      dirty: progress.state.dirty,
      resettable: progress.state.dirty || shellHasOutput,
    };
  }

  function emit(): void {
    options.onUpdate(snapshot());
  }

  // Re-render when the terminal resizes so dynamically centered content
  // (splash, animations) reflows to the new column count. The animation frame
  // loop already re-renders each tick, but static screens (splash, buffer)
  // have no other trigger. Guarded for jsdom where ResizeObserver is absent.
  let viewResizeObserver: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined') {
    viewResizeObserver = new ResizeObserver(() => {
      // Skip when an animation loop is running — it drives its own repaints.
      if (!activeLoop) {
        render();
      }
    });
    viewResizeObserver.observe(view.el);
  }

  // Record the seed cursor position as visited before painting, so the starting
  // cell is already highlighted on first render.
  trackVisit();

  // If the lesson seeds into animation mode, start the loop before first paint.
  if (progress.state.mode === 'animation') {
    startLoop();
  }

  // Paint the seed immediately; the sidebar seeds its own snapshot in parallel,
  // so no update is emitted until the first keystroke changes something.
  render();

  return {
    el: view.el,
    focus: () => view.focus(),
    reset() {
      for (const timer of attemptTimers.values()) {
        clearTimeout(timer);
      }
      attemptTimers.clear();
      pendingAttempts.clear();
      stopLoop();
      progress = controller.seed();
      progress = { ...progress, announcement: 'Lesson reset' };
      if (visited) {
        visited = new Set<string>();
      }
      trackVisit();
      if (progress.state.mode === 'animation') {
        startLoop();
      }
      render();
      emit();
      view.focus();
    },
    reportIncomplete() {
      progress = controller.gradeIncomplete(progress);
      emit();
      return engine.explainIncomplete(progress.state, options.lesson, visited);
    },
    destroy() {
      for (const timer of attemptTimers.values()) {
        clearTimeout(timer);
      }
      attemptTimers.clear();
      pendingAttempts.clear();
      viewResizeObserver?.disconnect();
      stopLoop();
      view.destroy();
    },
  };
}
