import {
  createState,
  dispatch,
  enterAnimation,
  enterExplorer,
  enterShell,
  enterSplash,
  getVirtualFile,
  isVisualMode,
  moveCursor,
  actionAttempts,
} from '@/engine';
import type { Action, EditorState, FilterVerdict, TerrainRules } from '@/engine';
import {
  commandMatches,
  describeIncomplete,
  evaluateChecklist,
  type ChecklistContext,
  type LessonFileState,
  type RequirementResult,
} from '@/validation/checklist';
import { isProseLesson, type ClientLessonDefinition, type CommandLimit } from './types';

const SUBSTITUTE_COMMAND_LIMIT = '/^:%s\\/.*\\/.*\\/(?!.*n)[gi]*$/';

/**
 * A predicate over a *resolved* command; commands it rejects mutate no state. It
 * is handed the command a keystroke completed (`dd`, `:wq`), not the leading key,
 * plus that command's resolved `count` and the history *before* it ran, so it can
 * enforce usage caps as well as allow/deny. It returns a {@link FilterVerdict}:
 * `true` to run, or a rejection that may carry a status-line message. See
 * {@link buildCommandFilter} for how a lesson's `allowedCommands` /
 * `disallowedCommands` / `commandLimits` become one.
 */
export type AllowedInput = (
  command: string,
  count: number,
  priorHistory: readonly Action[]
) => FilterVerdict;

/**
 * Whether a resolved command matches one `allowedCommands`/`disallowedCommands`
 * entry. A bare `:` or `/` is a family wildcard — any ex command, any search — so
 * a lesson can allow or forbid the whole command line or all searching without
 * naming each verb. Every other entry is matched exactly as a checklist `command`
 * is: `:w` matches `:w` and `:w foo` but never `:wq`, and a single key matches
 * only itself. That shared rule is the point — the filter and the checklist judge
 * commands the same way, so "allow `:w`" and "require `:w`" mean the same thing.
 *
 * An entry written as a `/pattern/flags` literal is matched as a regex by
 * {@link commandMatches}; it is longer than the single-character `:`/`/`
 * wildcards, so it never collides with them.
 */
function matchesFilterEntry(command: string, entry: string): boolean {
  if (entry === ':') {
    return command.startsWith(':');
  }
  if (entry === '/') {
    return command.startsWith('/');
  }
  return commandMatches(command, entry, false);
}

/** A `CommandLimit`'s two knobs, with the bare-number shorthand expanded. */
function normalizeLimit(limit: CommandLimit): { times?: number; maxCount?: number } {
  return typeof limit === 'number' ? { times: limit } : limit;
}

function displayLimitEntry(entry: string): string {
  return entry === SUBSTITUTE_COMMAND_LIMIT ? ':%s/old/new/g' : entry;
}

/**
 * How many times a command matching `entry` has already been invoked, read off
 * history. Counts issued commands only — a `filtered` action (a prior refusal) and
 * a typed insert-mode character never count against a cap, mirroring the checklist's
 * `isIssuedCommand`, with the same `Enter` carve-out.
 */
function countCommandUses(history: readonly Action[], entry: string): number {
  return history.filter(
    (action) =>
      action.type !== 'filtered' &&
      action.command !== undefined &&
      (action.type !== 'insert' || action.command === 'Enter') &&
      matchesFilterEntry(action.command, entry)
  ).length;
}

/**
 * Compile a lesson's `allowedCommands` / `disallowedCommands` / `commandLimits`
 * into one predicate. An allow list restricts to its members; a deny list subtracts
 * its members from whatever the allow list left (or from everything, when there is
 * no allow list); both reject silently. A cap then rejects a command that has run
 * its `times` already, or that carries a count above its `maxCount`, with a message
 * for the status line. A lesson with none of the three returns `undefined` — no
 * filter, every command runs.
 */
function buildCommandFilter(
  allowed: readonly string[] | undefined,
  disallowed: readonly string[] | undefined,
  limits: Record<string, CommandLimit> | undefined
): AllowedInput | undefined {
  const limitEntries = limits ? Object.entries(limits) : [];
  if (!allowed?.length && !disallowed?.length && !limitEntries.length) {
    return undefined;
  }
  return (command, count, priorHistory) => {
    if (disallowed?.length && disallowed.some((entry) => matchesFilterEntry(command, entry))) {
      return { reason: 'deny' as const };
    }
    if (allowed?.length && !allowed.some((entry) => matchesFilterEntry(command, entry))) {
      return { reason: 'allow' as const };
    }
    for (const [entry, limit] of limitEntries) {
      if (!matchesFilterEntry(command, entry)) {
        continue;
      }
      const { times, maxCount } = normalizeLimit(limit);
      if (times !== undefined && countCommandUses(priorHistory, entry) >= times) {
        return {
          reason: 'limit' as const,
          message: `limit reached: ${displayLimitEntry(entry)} may be used ${times} time${times === 1 ? '' : 's'}`,
        };
      }
      if (maxCount !== undefined && count > maxCount) {
        return {
          reason: 'limit' as const,
          message: `count too high: ${entry} allows at most ${maxCount} at a time`,
        };
      }
    }
    return true;
  };
}

/**
 * The outcome of feeding one input to the engine: the advanced state plus a
 * polite screen-reader announcement describing the meaningful result of that
 * keystroke (a mode change, a completed command, an error), or an empty string
 * when nothing worth voicing happened. Generic to the runtime — the hook carries
 * the string to the terminal's live region without knowing how it was derived.
 */
export interface FeedResult<TState> {
  state: TState;
  announcement: string;
  /**
   * True when this keystroke finished an attempt at a command, as opposed to
   * typing part of one. The runtime uses it to decide when a checklist item has
   * been tried and missed, and so when to surface that item's hint; it never
   * inspects how the engine decided.
   */
  attempted: boolean;
}

/**
 * The narrow, engine-agnostic surface the lesson runtime ({@link useLesson})
 * drives. A concrete engine seeds pristine state from a lesson's opaque payload,
 * advances that state one input at a time, and declares which inputs a lesson
 * accepts. The runtime never inspects the state shape or the Vim-specific payload
 * directly — everything Vim flows through this boundary, so a different course
 * could supply its own engine without touching the hook.
 */
export interface LessonEngine<TState> {
  /** Build the pristine state for a lesson (buffer, filesystem, start mode). */
  seed(lesson: ClientLessonDefinition): TState;
  /** Advance the state by one input key, honoring an optional input filter. */
  feed(state: TState, key: string, allowedInput?: AllowedInput): FeedResult<TState>;
  /**
   * The input filter for a lesson, or undefined when every committed command is
   * allowed (any lesson that declares no restriction).
   */
  allowedInput(lesson: ClientLessonDefinition): AllowedInput | undefined;
  /**
   * Per-checklist-item completion derived from the current state, one result per
   * `config.checklist` item, so the checklist tracks the learner live. The
   * runtime reads `passed` and `monotonic` without inspecting how either was
   * computed: it latches a monotonic item once it passes, and mirrors a
   * non-monotonic one in both directions.
   */
  checkRequirements(
    state: TState,
    lesson: ClientLessonDefinition,
    visitedPositions?: ReadonlySet<string> | null
  ): RequirementResult[];
  /**
   * The learner-facing line explaining why a lesson is not finished, shown when
   * they try to advance too early. The runtime displays it without inspecting how
   * it was derived.
   */
  explainIncomplete(
    state: TState,
    lesson: ClientLessonDefinition,
    visitedPositions?: ReadonlySet<string> | null
  ): string;
}

/** Build engine-level terrain rules from the lesson config's terrain entries. */
function buildTerrainRules(
  terrain: { glyph: string; passableBy: string[] }[] | undefined
): TerrainRules | null {
  if (!terrain || terrain.length === 0) {
    return null;
  }
  return new Map(terrain.map(({ glyph, passableBy }) => [glyph, new Set(passableBy)]));
}

/** Split an inlined file body into the engine's line array. */
function toLines(body: string): string[] {
  return body.split('\n');
}

/** Spoken names for each mode; distinct from the terse visual status labels. */
const MODE_ANNOUNCEMENTS: Record<EditorState['mode'], string> = {
  normal: 'normal mode',
  insert: 'insert mode',
  visual: 'visual mode',
  'visual-line': 'visual line mode',
  'command-line': 'command-line mode',
  explorer: 'file explorer',
  shell: 'shell',
  animation: 'animation playing, press any key to continue',
};

/** Spoken confirmations for completed edits; motions stay deliberately silent. */
const EDIT_ANNOUNCEMENTS: Record<string, string> = {
  x: 'character deleted',
  r: 'character replaced',
  dd: 'line deleted',
  dw: 'word deleted',
  D: 'deleted to end of line',
  yy: 'line yanked',
  p: 'pasted',
  u: 'undo',
  'Ctrl-r': 'redo',
};

/**
 * Spoken confirmations for an operator that consumed a visual selection, where the
 * same keys mean something wider than they do in normal mode. `c` is deliberately
 * absent: it lands the learner in insert mode, and hearing that matters more than
 * hearing what it deleted on the way.
 */
const SELECTION_ANNOUNCEMENTS: Record<string, string> = {
  d: 'selection deleted',
  x: 'selection deleted',
  y: 'selection yanked',
};

/**
 * The string worth speaking after one keystroke, or `''` when nothing meaningful
 * happened. An engine status message (an error, a search result) wins; then a
 * toggled display option, then a mode change; then a completed edit. Bare motions
 * and hardware no-ops return `''`, so the de-duplicating live region stays quiet
 * through a run of `j`/`l`/`w`.
 *
 * `:set number` outranks the mode change it also causes (command-line back to
 * normal): the gutter appearing is the point of the command, and "normal mode" is
 * incidental to it. An operator on a visual selection outranks its mode change for
 * the same reason — returning to normal mode is a side effect of the edit.
 */
function announce(prev: EditorState, next: EditorState, actions: readonly Action[]): string {
  if (next.status) {
    return next.status;
  }
  // Vim opening on the splash is a mode change to normal, which says nothing
  // about the thing that just happened: it launched with no file.
  if (next.splashVisible && !prev.splashVisible) {
    return 'Vim splash screen. Press any key to continue.';
  }
  if (next.showLineNumbers !== prev.showLineNumbers) {
    return next.showLineNumbers ? 'line numbers shown' : 'line numbers hidden';
  }
  const last = actions[actions.length - 1];
  const command = last?.type === 'edit' ? last.command : undefined;
  if (command && isVisualMode(prev.mode) && SELECTION_ANNOUNCEMENTS[command]) {
    return SELECTION_ANNOUNCEMENTS[command];
  }
  if (next.mode !== prev.mode) {
    return MODE_ANNOUNCEMENTS[next.mode];
  }
  if (command && EDIT_ANNOUNCEMENTS[command]) {
    return EDIT_ANNOUNCEMENTS[command];
  }
  // Cursor moved to a different line: announce the destination line's text so
  // screen readers voice it during Vim navigation. Empty lines announce as
  // "blank line" rather than silence.
  if (next.cursor.line !== prev.cursor.line) {
    const lineText = next.buffer[next.cursor.line];
    return lineText === undefined || lineText === '' ? 'blank line' : lineText;
  }
  return '';
}

const ENTER_KEYS = new Set(['Enter', 'Return']);

/**
 * Whether this keystroke finished an attempt at a command, rather than typing
 * part of one. Two cases count, and nothing else does:
 *
 * - A `filtered` action, meaning the lesson's `allowedCommands` rejected the key
 *   outright. The learner pressed a command this lesson does not accept.
 * - `Enter` at the shell prompt or on Vim's command line, where keys buffer up
 *   until Enter submits them. `:` and `w` on their own are a command being
 *   typed; Enter is the moment it was meant to run. Enter while a register name
 *   is pending confirms a paste, not an ex command attempt.
 *
 * Deliberately excluded: ordinary insert-mode typing and bare motions, which are
 * not attempts at anything and would otherwise reveal a hint on the first key.
 */
function isAttempt(prev: EditorState, key: string, actions: readonly Action[]): boolean {
  if (actions.some((action) => action.type === 'filtered' || action.type === 'blocked')) {
    return true;
  }

  const completedCommand = actions.find((action) => action.command !== undefined);
  if (completedCommand !== undefined && actionAttempts.get(completedCommand) === false) {
    return false;
  }

  return (
    ENTER_KEYS.has(key) &&
    (prev.mode === 'shell' || (prev.mode === 'command-line' && !prev.commandLineRegisterPending))
  );
}

/**
 * Whether `state.buffer` currently holds the active file's text. The explorer and
 * the shell replace the buffer with their own display, so e.g. after `:q` the
 * buffer is the shell prompt, not the file — the filesystem copy is
 * authoritative there. The splash needs no mention: it draws over an empty
 * unnamed buffer, which is no file's text and matches no path.
 */
function editingBuffer(state: EditorState): boolean {
  return state.mode !== 'shell' && state.mode !== 'explorer' && state.mode !== 'animation';
}

/**
 * Resolve any path to its working/saved contents and write state. The active
 * file's live edits are in `buffer` while the editor shows it (the filesystem lags
 * until `:w`), so surface those plus `state.dirty` for it; every other case reads
 * from the filesystem directly. Every file predicate goes through here, so a test
 * naming a file the learner has since left sees its real contents rather than a
 * stale snapshot.
 */
function fileReader(state: EditorState): (path: string) => LessonFileState | null {
  return (path) => {
    const file = getVirtualFile(state.files, path);
    if (!file) {
      return null;
    }
    if (path === state.activeFilePath && editingBuffer(state)) {
      return {
        contents: state.buffer,
        saved: file.saved,
        dirty: state.dirty,
        written: file.written,
      };
    }
    return { contents: file.contents, saved: file.saved, dirty: file.dirty, written: file.written };
  };
}

/** The validator's view of the engine: history, live position, files, session. */
function checklistContext(
  state: EditorState,
  visitedPositions: ReadonlySet<string> | null = null
): ChecklistContext {
  return {
    history: state.history,
    register: state.register,
    activeFilePath: state.activeFilePath,
    cursor: state.cursor,
    file: fileReader(state),
    inShell: state.mode === 'shell',
    showLineNumbers: state.showLineNumbers,
    quickfix: state.quickfix,
    quickfixListing: state.quickfixListing,
    visitedPositions,
  };
}

/**
 * The Vim engine behind the lesson runtime. It alone reads the Vim-specific
 * payload (inlined file bodies, taught commands, start mode) and translates it
 * into engine state; the runtime sees only {@link LessonEngine}.
 */
export const vimLessonEngine: LessonEngine<EditorState> = {
  seed(lesson) {
    // Prose lessons carry no config, and so no files or engine state.
    if (isProseLesson(lesson)) {
      return createState(['']);
    }

    const files: Record<string, readonly string[]> = {};
    for (const [path, body] of Object.entries(lesson.files)) {
      files[path] = toLines(body);
    }

    const { start, open, cursor, unsupportedMessage } = lesson.config;
    const seeded = createState([''], { files, activeFilePath: open });
    // Content cursors are 1-based `[row, col]`; the engine is 0-based.
    const withCursor = moveCursor(
      { ...seeded, unsupportedMessage },
      { line: cursor[0] - 1, col: cursor[1] - 1 }
    );

    const terrain = buildTerrainRules(lesson.config.terrain);
    const positioned = terrain ? { ...withCursor, terrain } : withCursor;

    if (start === 'explore') {
      return enterExplorer(positioned);
    }
    // The raw 0-based cursor is forwarded as `openCursor` because the seeded
    // buffer is empty (shell-start lessons have no active file yet), so
    // `moveCursor` above clamped `state.cursor` to (0,0). `reopenVim` clamps
    // `openCursor` against the real file buffer when the learner opens it.
    if (start === 'shell') {
      const openCursor = { line: cursor[0] - 1, col: cursor[1] - 1 };
      return enterShell(positioned, { openCursor });
    }
    // Vim already launched with no file named, so the splash is on screen and the
    // learner's first keystrokes go into its command prompt.
    if (start === 'splash') {
      return enterSplash(positioned);
    }
    // An animation scene owns the screen until any key dismisses it.
    if (start === 'animation' && lesson.config.scene) {
      return enterAnimation(positioned, lesson.config.scene);
    }
    return positioned;
  },

  feed(state, key, allowedInput) {
    const { state: next, actions } = dispatch(
      state,
      key,
      allowedInput ? { allowedCommands: allowedInput } : undefined
    );
    return {
      state: next,
      announcement: announce(state, next, actions),
      attempted: isAttempt(state, key, actions),
    };
  },

  allowedInput(lesson) {
    if (isProseLesson(lesson)) {
      return undefined;
    }
    return buildCommandFilter(
      lesson.config.allowedCommands,
      lesson.config.disallowedCommands,
      lesson.config.commandLimits
    );
  },

  checkRequirements(state, lesson, visitedPositions) {
    if (isProseLesson(lesson)) {
      return [];
    }

    return evaluateChecklist(lesson, checklistContext(state, visitedPositions));
  },

  explainIncomplete() {
    return describeIncomplete();
  },
};
