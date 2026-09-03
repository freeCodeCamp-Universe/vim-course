import styles from './terminalView.module.css';
import { textChars, textLength, textSlice } from '../engine/text';

export interface TerminalPosition {
  line: number;
  col: number;
}

export interface TerminalRange {
  start: TerminalPosition;
  end: TerminalPosition;
}

export interface Decoration {
  range: TerminalRange;
  variant: 'mark' | 'qf-location' | 'qf-column';
}

/**
 * Everything the view paints for one frame. A binding flattens its engine's state
 * into this shape; the view holds no editor concept (no mode, netrw, or shell), so
 * a different engine can drive the same grid unchanged.
 */
/**
 * The accessibility role of a single terminal line. `'content'` is a normal
 * navigable row; `'decorative'` hides the row from assistive tech;
 * `{ role: 'img', label }` marks the row as part of a described image group
 * (consecutive runs with the same label are wrapped in one `role="img"`
 * container).
 */
export type LineRole = 'content' | 'decorative' | { role: 'img'; label: string };
export type TerminalLineClassName = keyof typeof styles;

export interface TerminalViewModel {
  /** The rows to render. One string per visible line; the sole source of text. */
  lines: string[];
  /**
   * One gutter label per row, rendered ahead of the text (Vim's line numbers,
   * for instance). The binding pads every label to a single shared width; the
   * view derives the text column's width from that so a soft-wrapped row's
   * continuation lines align under the text rather than under the numbers. Null
   * renders no gutter at all.
   */
  gutter: string[] | null;
  /** The cursor cell, or null to hide it (e.g. while a prompt owns the caret). */
  cursor: TerminalPosition | null;
  cursorStyle: 'block' | 'bar';
  /** A highlighted character range (a netrw row, a visual selection), or null. */
  selection: TerminalRange | null;
  /** The selection color treatment. Explorer rows use the cursor treatment. */
  selectionStyle?: 'accent' | 'cursor';
  /** Highlight ranges that draw attention to specific text. */
  decorations?: readonly Decoration[];
  /**
   * Cells the cursor has visited, keyed as `"line,col"` strings, or null when
   * visited-position highlighting is off. Visited cells are rendered with a
   * distinct color so the learner sees which positions remain in a tracing
   * exercise.
   */
  visited: ReadonlySet<string> | null;
  /** The leading footer cell (a Vim status line, a shell prompt line). */
  footerStart: string;
  /** Whether the leading footer cell is an error message. */
  footerIsError?: boolean;
  /** Whether the leading footer cell is a continuation hint. */
  footerIsHint?: boolean;
  /** The trailing footer cell (Vim's ruler); empty hides it. */
  footerEnd: string;
  /** Whether the trailing footer column, including pending keys, is shown. */
  footerEndVisible?: boolean;
  /** An accessible-only description for the trailing footer cell. */
  footerEndLabel?: string;
  /** Pending command keys shown above the ruler (e.g. "7", "d", "di"). */
  footerPending?: string;
  /** The cursor column in the leading footer cell, or null for no footer cursor. */
  footerCursor?: number | null;
  /**
   * A polite announcement describing the meaningful result of the last keystroke,
   * supplied by the binding. De-duplicated before it reaches the live region;
   * empty announces nothing. The view never derives it.
   */
  announcement: string;
  /**
   * When true, the grid content is decorative and hidden from assistive tech
   * (`aria-hidden`). The screen element keeps its accessible name and
   * focusability, and the live region still announces normally.
   */
  contentHidden?: boolean;
  /**
   * Per-line accessibility role, parallel to `lines`. When absent every line is
   * treated as `'content'`. Decorative lines are excluded from `aria-setsize`
   * and hidden via `aria-hidden`; image-group lines are wrapped in a single
   * `role="img"` container with the given label.
   */
  lineRoles?: LineRole[];
  /** Optional CSS-module class, parallel to `lines`, for special presentation rows. */
  lineClassNames?: (TerminalLineClassName | undefined)[];
}

export interface TerminalViewOptions {
  accessibleName: string;
  /** Receives a normalized key string for every captured keystroke. */
  onKey: (key: string) => void;
  /** Receives clipboard text on a system paste (Cmd+V / Ctrl+V). */
  onPaste?: (text: string) => void;
}

/**
 * A framework-free handle onto a mounted terminal. React (or anything else)
 * appends {@link el} once and never looks inside it; the binding drives repaints
 * through {@link update}. The same pattern xterm.js, CodeMirror 6, and Monaco use.
 */
export interface TerminalView {
  /** The root element to mount. The owner appends it and calls `destroy` to tear down. */
  readonly el: HTMLDivElement;
  /** Measure the available monospace character columns in the terminal screen. */
  measureCols(): number;
  /** Measure the available text rows that fit in the screen area. */
  measureRows(): number;
  /** Repaint the grid, footer, and live region from a fresh model. */
  update(model: TerminalViewModel): void;
  /**
   * Move focus onto the screen, unless it is hidden (its panel collapsed on the
   * tabbed layout, where `offsetParent` is null). Returns whether focus moved, so
   * a caller can fall back elsewhere when the terminal is off screen.
   */
  focus(): boolean;
  /** Remove the element and its listeners. Owning the DOM means owning teardown. */
  destroy(): void;
}

const ARROW_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);

/**
 * Normalize a keyboard event into the engine's key vocabulary, or null when the
 * view must not capture the key. `Tab`/`Shift+Tab` are never captured so the
 * terminal is not a keyboard trap; `Meta` combos and most `Alt`/`Ctrl` combos
 * pass through untouched so global course shortcuts (drawer, next/prev, primary
 * action) still fire while the terminal is focused. The exceptions are
 * `Alt+Arrow`/`Ctrl+Arrow` (shell word-jump) and `Alt+Backspace`/
 * `Ctrl+Backspace` (shell word-delete).
 */
/** Modifier-only keys that fire their own `keydown` but carry no character. */
const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock']);

function normalizeKey(event: KeyboardEvent): string | null {
  if (event.key === 'Tab' || MODIFIER_KEYS.has(event.key)) {
    return null;
  }
  if (event.altKey && (ARROW_KEYS.has(event.key) || event.key === 'Backspace')) {
    return `Alt-${event.key}`;
  }
  if (event.metaKey || event.altKey) {
    return null;
  }
  if (event.ctrlKey) {
    if (ARROW_KEYS.has(event.key) || event.key === 'Backspace') {
      return `Ctrl-${event.key}`;
    }
    const key = event.key.toLowerCase();
    if (key === 'c') {
      return 'Ctrl-c';
    }
    if (key === 'r') {
      return 'Ctrl-r';
    }
    if (key === 'g') {
      return 'Ctrl-g';
    }
    return null;
  }
  return event.key;
}

/** Order a range so `start` never comes after `end`. */
function orderRange(range: TerminalRange): TerminalRange {
  const { start, end } = range;
  const startsFirst = start.line < end.line || (start.line === end.line && start.col <= end.col);
  return startsFirst ? range : { start: end, end: start };
}

/** The `[from, to)` selected column span for a line, or null if unselected. */
function lineSelection(
  range: TerminalRange | null,
  index: number,
  length: number
): [number, number] | null {
  if (!range) {
    return null;
  }
  const { start, end } = orderRange(range);
  if (index < start.line || index > end.line) {
    return null;
  }
  const from = index === start.line ? start.col : 0;
  const to = index === end.line ? end.col : length;
  if (to <= from) {
    return null;
  }
  return [from, to];
}

/** The merged `[from, to)` decoration spans for a line. */
function lineDecorations(
  decorations: readonly Decoration[] | undefined,
  index: number,
  length: number
): { from: number; to: number; variant: Decoration['variant'] }[] {
  if (!decorations || decorations.length === 0) {
    return [];
  }

  const spans: { from: number; to: number; variant: Decoration['variant'] }[] = [];
  for (const decoration of decorations) {
    const { start, end } = orderRange(decoration.range);
    if (index < start.line || index > end.line) {
      continue;
    }
    const from = index === start.line ? start.col : 0;
    const to = index === end.line ? end.col : length;
    if (to > from) {
      spans.push({ from, to, variant: decoration.variant });
    }
  }

  spans.sort((spanA, spanB) => spanA.from - spanB.from);
  const merged: { from: number; to: number; variant: Decoration['variant'] }[] = [];
  for (const span of spans) {
    const { from, to, variant } = span;
    const previous = merged[merged.length - 1];
    if (previous && variant === previous.variant && from <= previous.to) {
      previous.to = Math.max(previous.to, to);
    } else {
      merged.push({ from, to, variant });
    }
  }
  return merged;
}

/**
 * Append a run of plain or visited characters. When `visitedCols` is null the
 * whole run is one text node; when present, each character is checked and
 * visited cells get their own `<span>` with the visited class.
 */
function appendVisitedRun(
  parent: Node,
  text: string,
  lineIndex: number,
  offset: number,
  visitedCols: ReadonlySet<string> | null
): void {
  if (!visitedCols) {
    parent.appendChild(document.createTextNode(text));
    return;
  }
  let plain = '';
  const chars = textChars(text);
  for (let i = 0; i < chars.length; i++) {
    const col = offset + i;
    if (visitedCols.has(`${lineIndex},${col}`)) {
      if (plain) {
        parent.appendChild(document.createTextNode(plain));
        plain = '';
      }
      const span = document.createElement('span');
      span.className = styles.visited;
      span.dataset.testid = 'terminal-visited';
      span.textContent = chars[i];
      parent.appendChild(span);
    } else {
      plain += chars[i];
    }
  }
  if (plain) {
    parent.appendChild(document.createTextNode(plain));
  }
}

function appendRun(
  parent: Node,
  text: string,
  lineIndex: number,
  offset: number,
  cursorCol: number | null,
  cursorStyle: 'block' | 'bar',
  visitedCols: ReadonlySet<string> | null
): void {
  if (cursorCol === null || cursorCol < offset || cursorCol >= offset + textLength(text)) {
    appendVisitedRun(parent, text, lineIndex, offset, visitedCols);
    return;
  }
  const at = cursorCol - offset;
  appendVisitedRun(parent, textSlice(text, 0, at), lineIndex, offset, visitedCols);
  const cell = document.createElement('span');
  cell.className = `${styles.cursor} ${styles[cursorStyle]}`;
  cell.dataset.testid = 'terminal-cursor';
  cell.textContent = textSlice(text, at, at + 1);
  parent.appendChild(cell);
  appendVisitedRun(parent, textSlice(text, at + 1), lineIndex, at + 1 + offset, visitedCols);
}

/**
 * Build one buffer row, which the browser may soft-wrap across several visual
 * lines. Cursor motion rebuilds only the frame's rows; focus lives on the screen
 * element above them, so replacing the grid's children never drops it.
 */
function buildLine(
  text: string,
  lineIndex: number,
  gutter: string | undefined,
  selection: [number, number] | null,
  decorationSpans: { from: number; to: number; variant: Decoration['variant'] }[],
  selectionStyle: 'accent' | 'cursor',
  cursorCol: number | null,
  cursorStyle: 'block' | 'bar',
  visitedCols: ReadonlySet<string> | null,
  lineRole: LineRole,
  lineClassName: TerminalLineClassName | undefined,
  contentPosition: number,
  contentCount: number
): HTMLDivElement {
  const line = document.createElement('div');
  line.className = [styles.line, lineClassName ? styles[lineClassName] : '']
    .filter(Boolean)
    .join(' ');

  if (lineRole === 'content') {
    line.setAttribute('role', 'listitem');
    line.setAttribute('aria-posinset', String(contentPosition + 1));
    line.setAttribute('aria-setsize', String(contentCount));
  } else if (lineRole === 'decorative') {
    line.setAttribute('aria-hidden', 'true');
  }
  // img: no role or position attributes; the wrapping container handles them.

  if (gutter !== undefined) {
    const label = document.createElement('span');
    label.className = styles.gutter;
    label.dataset.testid = 'terminal-gutter';
    label.textContent = gutter;
    line.appendChild(label);
  }

  // The cursor and a selection can each reach one cell past the last character
  // (an empty line, insert mode at the end of one, a visual-line selection over a
  // blank row), so pad the row out to that reach. The extra cell is the blank a
  // terminal would sit the highlight or the block on.
  const reach = Math.max(
    textLength(text),
    selection?.[1] ?? 0,
    ...decorationSpans.map(({ to }) => to),
    cursorCol === null ? 0 : cursorCol + 1
  );
  const padded = text + ' '.repeat(Math.max(0, reach - textLength(text)));

  const textSpan = document.createElement('span');
  textSpan.className = styles.text;

  const styledSpans: { from: number; to: number; className: string; testId: string }[] = [];
  if (selection) {
    styledSpans.push({
      from: selection[0],
      to: selection[1],
      className: styles[selectionStyle === 'cursor' ? 'cursor-selection' : 'selection'],
      testId: 'terminal-selection',
    });
  }
  for (const { from, to, variant } of decorationSpans) {
    const segments: [number, number][] = [[from, to]];
    if (selection) {
      const [selectionFrom, selectionTo] = selection;
      const remaining = segments.pop()!;
      if (remaining[0] < selectionFrom) {
        segments.push([remaining[0], Math.min(remaining[1], selectionFrom)]);
      }
      if (remaining[1] > selectionTo) {
        segments.push([Math.max(remaining[0], selectionTo), remaining[1]]);
      }
    }
    for (const [segmentFrom, segmentTo] of segments) {
      if (segmentTo > segmentFrom) {
        const cssClass =
          variant === 'qf-location'
            ? 'qf-location'
            : variant === 'qf-column'
              ? 'qf-column'
              : 'mark';
        const testId =
          variant === 'qf-location'
            ? 'terminal-qf-location'
            : variant === 'qf-column'
              ? 'terminal-qf-column'
              : 'terminal-mark';
        styledSpans.push({
          from: segmentFrom,
          to: segmentTo,
          className: styles[cssClass],
          testId,
        });
      }
    }
  }

  styledSpans.sort((spanA, spanB) => spanA.from - spanB.from);
  let offset = 0;
  for (const { from, to, className, testId } of styledSpans) {
    appendRun(
      textSpan,
      textSlice(padded, offset, from),
      lineIndex,
      offset,
      cursorCol,
      cursorStyle,
      visitedCols
    );
    const highlight = document.createElement('span');
    highlight.className = className;
    highlight.dataset.testid = testId;
    appendRun(
      highlight,
      textSlice(padded, from, to),
      lineIndex,
      from,
      cursorCol,
      cursorStyle,
      visitedCols
    );
    textSpan.appendChild(highlight);
    offset = to;
  }
  appendRun(
    textSpan,
    textSlice(padded, offset),
    lineIndex,
    offset,
    cursorCol,
    cursorStyle,
    visitedCols
  );

  // Screen readers collapse empty elements. A non-breaking space makes the row
  // announce as "blank" instead of being silently skipped (xterm.js and hterm
  // both use this technique).
  if (textSpan.textContent === '') {
    textSpan.textContent = ' ';
  }

  line.appendChild(textSpan);
  return line;
}

/**
 * Mount a presentation-only monospace grid and return a handle to drive it. It
 * renders `lines`, an optional `cursor` and `selection`, and footer chrome from
 * each {@link TerminalViewModel}, and forwards captured keystrokes to `onKey`.
 *
 * Rows soft-wrap the way a terminal running Vim under its default `wrap` does: a
 * row too wide for the screen continues on the next visual line instead of
 * scrolling sideways, and `lines` indices stay the logical line numbers a lesson
 * can point a learner at. The polite live region is de-duplicated in place — a
 * repeat of the current announcement, or an empty one, leaves it untouched, so a
 * run of motions or a repeated error never re-announces.
 */
export function createTerminalView(options: TerminalViewOptions): TerminalView {
  const el = document.createElement('div');
  el.className = styles.terminal;

  const screen = document.createElement('div');
  screen.className = styles.screen;
  screen.setAttribute('role', 'application');
  screen.setAttribute('aria-roledescription', 'terminal');
  screen.setAttribute('aria-label', options.accessibleName);
  screen.tabIndex = 0;

  const grid = document.createElement('div');
  grid.className = styles.grid;
  grid.setAttribute('role', 'list');
  grid.setAttribute('aria-label', `${options.accessibleName} contents`);
  screen.appendChild(grid);

  const live = document.createElement('div');
  live.className = 'sr-only';
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  live.dataset.testid = 'terminal-announcement';

  const footer = document.createElement('div');
  footer.className = styles.footer;
  footer.dataset.testid = 'terminal-footer';
  const footerStart = document.createElement('span');
  footerStart.className = styles['footer-start'];
  const footerEndCol = document.createElement('span');
  footerEndCol.className = styles['footer-end-col'];
  const footerPending = document.createElement('span');
  footerPending.className = styles['footer-pending'];
  footerPending.dataset.testid = 'terminal-pending';
  const footerEnd = document.createElement('span');
  const footerEndLabel = document.createElement('span');
  footerEndLabel.className = 'sr-only';
  footerEndCol.append(footerPending, footerEnd, footerEndLabel);
  footer.append(footerStart, footerEndCol);

  el.append(screen, live, footer);

  const onKeyDown = (event: KeyboardEvent): void => {
    // Cmd+V (macOS) / Ctrl+V (Windows/Linux): read the system clipboard
    // directly. A plain div[tabindex] may not receive a `paste` event on the
    // first attempt in some browsers; reading via the Clipboard API in the
    // keydown handler avoids that. The `paste` listener below remains as a
    // fallback for right-click and Edit-menu paste.
    if (
      (event.metaKey || event.ctrlKey) &&
      !event.shiftKey &&
      !event.altKey &&
      event.key.toLowerCase() === 'v' &&
      options.onPaste &&
      typeof navigator !== 'undefined' &&
      navigator.clipboard?.readText
    ) {
      event.preventDefault();
      navigator.clipboard.readText().then(
        (text) => {
          if (text) {
            options.onPaste!(text);
          }
        },
        () => {
          /* clipboard access denied — silently ignored */
        }
      );
      return;
    }

    const key = normalizeKey(event);
    if (key === null) {
      return;
    }
    event.preventDefault();
    options.onKey(key);
  };
  screen.addEventListener('keydown', onKeyDown);

  const onPaste = (event: ClipboardEvent): void => {
    const text = event.clipboardData?.getData('text/plain');
    if (text && options.onPaste) {
      event.preventDefault();
      options.onPaste(text);
    }
  };
  screen.addEventListener('paste', onPaste);

  let lastAnnouncement = '';
  let cachedCharWidth: number | null = null;

  // Invalidate the cached character width when the terminal resizes (covers
  // browser zoom and responsive font-size changes). Guarded for environments
  // where ResizeObserver is unavailable (jsdom).
  let resizeObserver: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      cachedCharWidth = null;
    });
    resizeObserver.observe(screen);
  }

  return {
    el,
    measureCols() {
      // Re-probe when the cache is empty or was measured on a detached element
      // (getBoundingClientRect returns 0 before the host is in the DOM).
      if (cachedCharWidth === null || cachedCharWidth <= 0) {
        const measure = document.createElement('span');
        measure.style.font = 'inherit';
        measure.style.position = 'absolute';
        measure.style.visibility = 'hidden';
        measure.style.whiteSpace = 'pre';
        measure.textContent = 'X';
        screen.appendChild(measure);
        cachedCharWidth = measure.getBoundingClientRect().width;
        measure.remove();
      }

      if (cachedCharWidth <= 0) {
        return 80;
      }

      const computed = getComputedStyle(screen);
      const padding =
        parseFloat(computed.paddingInlineStart) + parseFloat(computed.paddingInlineEnd);
      return Math.floor((screen.clientWidth - padding) / cachedCharWidth);
    },
    measureRows() {
      const lineHeight = parseFloat(getComputedStyle(screen).lineHeight);
      if (!lineHeight || lineHeight <= 0) {
        return 24;
      }
      const computed = getComputedStyle(screen);
      const paddingBlock =
        parseFloat(computed.paddingBlockStart) + parseFloat(computed.paddingBlockEnd);
      return Math.floor((screen.clientHeight - paddingBlock) / lineHeight);
    },
    update(model) {
      // Every gutter label shares one width, so the first one measures the
      // number column consistently across the frame.
      const gutterWidth = model.gutter?.[0]?.length ?? 0;
      if (gutterWidth > 0) {
        grid.style.setProperty('--terminal-gutter-width', `${gutterWidth}ch`);
        grid.style.setProperty('--terminal-right-inset', '2ch');
      } else {
        grid.style.removeProperty('--terminal-gutter-width');
        grid.style.removeProperty('--terminal-right-inset');
      }

      // Compute content-line positions for aria-posinset/aria-setsize. Only
      // lines with role 'content' count; decorative and img-group lines are
      // excluded from the announced list size.
      const roles = model.lineRoles;
      const contentPositions: number[] = [];
      let contentCount = 0;
      for (let li = 0; li < model.lines.length; li++) {
        const role = roles?.[li] ?? 'content';
        if (role === 'content') {
          contentPositions.push(contentCount++);
        } else {
          contentPositions.push(-1);
        }
      }

      const lineElements = model.lines.map((text, index) =>
        buildLine(
          text,
          index,
          model.gutter?.[index],
          lineSelection(model.selection, index, textLength(text)),
          lineDecorations(model.decorations, index, textLength(text)),
          model.selectionStyle ?? 'accent',
          model.cursor && model.cursor.line === index ? model.cursor.col : null,
          model.cursorStyle,
          model.visited,
          roles?.[index] ?? 'content',
          model.lineClassNames?.[index],
          contentPositions[index],
          contentCount
        )
      );

      // Group consecutive img-role lines with the same label into a single
      // role="img" container so screen readers announce the group as one image.
      const children: HTMLElement[] = [];
      let ci = 0;
      while (ci < lineElements.length) {
        const role = roles?.[ci];
        if (typeof role === 'object' && role.role === 'img') {
          const { label } = role;
          const wrapper = document.createElement('div');
          wrapper.setAttribute('role', 'img');
          wrapper.setAttribute('aria-label', label);
          while (ci < lineElements.length) {
            const r = roles?.[ci];
            if (typeof r === 'object' && r.role === 'img' && r.label === label) {
              wrapper.appendChild(lineElements[ci]);
              ci++;
            } else {
              break;
            }
          }
          children.push(wrapper);
        } else {
          children.push(lineElements[ci]);
          ci++;
        }
      }

      grid.replaceChildren(...children);

      const cursorElement = grid.querySelector<HTMLElement>('[data-testid="terminal-cursor"]');
      const cursorLine = cursorElement?.closest<HTMLElement>(`.${styles.line}`);
      if (cursorLine && typeof cursorLine.scrollIntoView === 'function') {
        cursorLine.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }

      if (model.contentHidden) {
        grid.setAttribute('aria-hidden', 'true');
        grid.removeAttribute('aria-label');
      } else {
        grid.removeAttribute('aria-hidden');
        grid.setAttribute('aria-label', `${options.accessibleName} contents`);
      }

      footerStart.textContent = model.footerStart;
      if (model.footerCursor !== undefined && model.footerCursor !== null) {
        // Pad using textLength (code points) rather than String.padEnd (UTF-16
        // units) so that supplementary-plane characters (e.g. emoji) don't
        // shift the cursor position off the end of the text, hiding it.
        const needed = model.footerCursor + 1 - textLength(model.footerStart);
        const footerText = needed > 0 ? model.footerStart + ' '.repeat(needed) : model.footerStart;
        footerStart.replaceChildren();
        appendRun(footerStart, footerText, 0, 0, model.footerCursor, model.cursorStyle, null);
      }
      footerStart.classList.toggle(styles['status-error'], model.footerIsError === true);
      footerStart.toggleAttribute('data-terminal-hint', model.footerIsHint === true);
      footerEnd.textContent = model.footerEnd;
      footerEndLabel.textContent = model.footerEndLabel ?? '';
      footerPending.textContent = model.footerPending ?? '';
      footerEndCol.hidden = model.footerEndVisible === false;

      if (model.announcement) {
        if (model.announcement !== lastAnnouncement) {
          live.textContent = model.announcement;
        } else {
          // Same text repeated (e.g., `j` lands on two identical lines). Prepend
          // a newline so the DOM mutation is visible to the screen reader without
          // changing the spoken output (hterm uses the same technique).
          live.textContent = '\n' + model.announcement;
        }
        lastAnnouncement = model.announcement;
      }
    },
    focus() {
      // In a collapsed tab panel the screen has no layout box (`offsetParent` is
      // null), and focusing a hidden element does nothing useful; report the
      // no-op so the caller can move focus elsewhere.
      if (screen.offsetParent === null) {
        return false;
      }
      screen.focus();
      return true;
    },
    destroy() {
      resizeObserver?.disconnect();
      screen.removeEventListener('keydown', onKeyDown);
      screen.removeEventListener('paste', onPaste);
      el.remove();
    },
  };
}
