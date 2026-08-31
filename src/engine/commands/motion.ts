import { getLine, lineCount } from '../buffer';
import { normalModeRegistry, type CommandResult } from '../registry';
import { moveCursor } from '../state';
import type { Buffer, Cursor, EditorState } from '../types';
import { textAt, textChars, textLength } from '../text';

/**
 * Normal-mode cursor motions: `h/j/k/l`, `w`, `b`, `0`, `$`, `gg`, `G`. Each
 * clamps to the buffer via `moveCursor` (no wrapping) and records a `motion`
 * action so workshop validators can observe it. Motions are also the ranges
 * that operators (Task 6) will consume.
 */

type CharClass = 'word' | 'punct' | 'space';

/** Vim word class: word chars, non-blank punctuation, or whitespace (incl. end of line). */
function classOf(ch: string | undefined): CharClass {
  if (ch === undefined || ch === ' ' || ch === '\t') {
    return 'space';
  }
  return /[A-Za-z0-9_]/.test(ch) ? 'word' : 'punct';
}

function charAt(buffer: Buffer, line: number, col: number): string | undefined {
  return textAt(getLine(buffer, line), col);
}

function isEmptyLine(buffer: Buffer, line: number): boolean {
  return textLength(getLine(buffer, line)) === 0;
}

/**
 * The start of the next word after the cursor. Skips the rest of the current
 * word, then whitespace and line breaks; an empty line counts as a word. At the
 * end of the buffer the cursor settles on the last character.
 */
function nextWordStart(buffer: Buffer, cursor: Cursor): Cursor {
  const last = lineCount(buffer) - 1;
  let { line, col } = cursor;
  let lineChars = textChars(getLine(buffer, line));
  const startClass = classOf(lineChars[col]);

  if (startClass !== 'space') {
    while (col < lineChars.length && classOf(lineChars[col]) === startClass) {
      col++;
    }
  }

  for (;;) {
    if (col >= lineChars.length) {
      if (line >= last) {
        return { line, col: Math.max(0, lineChars.length - 1) };
      }
      line++;
      col = 0;
      lineChars = textChars(getLine(buffer, line));
      if (lineChars.length === 0) {
        return { line, col: 0 };
      }
      if (classOf(lineChars[col]) !== 'space') {
        return { line, col };
      }
      continue;
    }
    if (classOf(lineChars[col]) === 'space') {
      col++;
      continue;
    }
    return { line, col };
  }
}

/** One position back, crossing to the end of the previous line at column 0. */
function stepBack(buffer: Buffer, line: number, col: number): Cursor | null {
  if (col > 0) {
    return { line, col: col - 1 };
  }
  if (line > 0) {
    return { line: line - 1, col: Math.max(0, textLength(getLine(buffer, line - 1)) - 1) };
  }
  return null;
}

/**
 * The start of the current or previous word. Steps back, skips whitespace and
 * line breaks (stopping on an empty line, which counts as a word), then walks to
 * the start of that word's class run. At the buffer start it stays at `{0, 0}`.
 */
function prevWordStart(buffer: Buffer, cursor: Cursor): Cursor {
  let pos = stepBack(buffer, cursor.line, cursor.col);
  if (!pos) {
    return { line: 0, col: 0 };
  }

  while (!isEmptyLine(buffer, pos.line) && classOf(charAt(buffer, pos.line, pos.col)) === 'space') {
    const back = stepBack(buffer, pos.line, pos.col);
    if (!back) {
      return { line: 0, col: 0 };
    }
    pos = back;
  }

  if (isEmptyLine(buffer, pos.line)) {
    return { line: pos.line, col: 0 };
  }

  const cls = classOf(charAt(buffer, pos.line, pos.col));
  while (pos.col > 0 && classOf(charAt(buffer, pos.line, pos.col - 1)) === cls) {
    pos = { line: pos.line, col: pos.col - 1 };
  }
  return pos;
}

function motionTo(state: EditorState, command: string, target: Cursor): CommandResult {
  return { state: moveCursor(state, target), actions: [{ type: 'motion', command }] };
}

const MATCHING_DELIMITERS: Record<string, string> = {
  '(': ')',
  '[': ']',
  '{': '}',
  ')': '(',
  ']': '[',
  '}': '{',
};

const OPENING_DELIMITERS = new Set(['(', '[', '{']);

function matchDelimiterAt(buffer: Buffer, line: number, col: number): Cursor | null {
  const current = charAt(buffer, line, col);
  if (!current || !(current in MATCHING_DELIMITERS)) {
    return null;
  }

  const target = MATCHING_DELIMITERS[current];
  const step = OPENING_DELIMITERS.has(current) ? 1 : -1;
  let depth = 0;

  for (let ln = line, c = col; ln >= 0 && ln < lineCount(buffer); ln += step) {
    const chars = textChars(getLine(buffer, ln));
    const start = ln === line ? c : step > 0 ? 0 : chars.length - 1;
    const end = step > 0 ? chars.length : -1;

    for (let index = start; index !== end; index += step) {
      const character = chars[index];
      if (character === current) {
        depth += 1;
      } else if (character === target) {
        depth -= 1;
        if (depth === 0) {
          return { line: ln, col: index };
        }
      }
    }
  }

  return null;
}

/**
 * Finds the match for `%`. If the cursor is on a delimiter, jumps to its
 * match. Otherwise scans forward on the current line for the first delimiter
 * and jumps to that delimiter's match.
 */
export function matchingDelimiter(buffer: Buffer, cursor: Cursor): Cursor | null {
  // Cursor is directly on a delimiter — jump to its match.
  const direct = matchDelimiterAt(buffer, cursor.line, cursor.col);
  if (direct !== null) {
    return direct;
  }

  // Cursor is not on a delimiter — scan forward on the current line for the
  // first bracket (opening or closing) and jump to its match. A closing bracket
  // produces a backward jump, e.g. cursor inside (…) finds ) and jumps to (.
  const chars = textChars(getLine(buffer, cursor.line));
  for (let col = cursor.col + 1; col < chars.length; col++) {
    if (chars[col] in MATCHING_DELIMITERS) {
      return matchDelimiterAt(buffer, cursor.line, col);
    }
  }

  return null;
}

function repeats(count: number | null): number {
  return count === null ? 1 : Math.max(1, count);
}

function repeatCursor(
  state: EditorState,
  count: number | null,
  move: (cursor: Cursor) => Cursor
): EditorState {
  let next = state;
  const times = repeats(count);
  for (let i = 0; i < times; i += 1) {
    next = moveCursor(next, move(next.cursor));
  }
  return next;
}

function repeatWordMotion(
  state: EditorState,
  count: number | null,
  move: (buffer: Buffer, cursor: Cursor) => Cursor
): EditorState {
  let cursor = state.cursor;
  const times = repeats(count);
  for (let i = 0; i < times; i += 1) {
    cursor = move(state.buffer, cursor);
  }
  return moveCursor(state, cursor);
}

normalModeRegistry.register('h', ({ state, count }) => ({
  state: repeatCursor(state, count, (cursor) => ({ line: cursor.line, col: cursor.col - 1 })),
  actions: [{ type: 'motion', command: 'h', ...(count !== null ? { count } : {}) }],
}));

normalModeRegistry.register('l', ({ state, count }) => ({
  state: repeatCursor(state, count, (cursor) => ({ line: cursor.line, col: cursor.col + 1 })),
  actions: [{ type: 'motion', command: 'l', ...(count !== null ? { count } : {}) }],
}));

/**
 * Vertical motion with desired-column memory. Vim remembers the column where a
 * vertical run started (`curswant`) and restores it whenever a subsequent line
 * is long enough. Short lines clamp the cursor to their end, but the memory
 * persists until a horizontal motion or edit clears it (see `dispatch`).
 */
function verticalMotion(
  state: EditorState,
  count: number | null,
  command: string,
  direction: 1 | -1
): CommandResult {
  const desiredCol = state.desiredCol ?? state.cursor.col;
  let next = state;
  const times = repeats(count);
  for (let i = 0; i < times; i += 1) {
    next = moveCursor(next, { line: next.cursor.line + direction, col: desiredCol });
  }
  return {
    state: { ...next, desiredCol },
    actions: [{ type: 'motion', command, ...(count !== null ? { count } : {}) }],
  };
}

normalModeRegistry.register('j', ({ state, count }) => verticalMotion(state, count, 'j', 1));

normalModeRegistry.register('k', ({ state, count }) => verticalMotion(state, count, 'k', -1));

// Arrow keys move like `h`/`l`/`k`/`j` but record their own command so they never
// stand in for a taught motion in a workshop checklist; dispatch also exempts them
// from the workshop command filter, so basic navigation always works.
const ARROW_HORIZONTAL: Record<string, (cursor: Cursor) => Cursor> = {
  ArrowLeft: (cursor) => ({ line: cursor.line, col: cursor.col - 1 }),
  ArrowRight: (cursor) => ({ line: cursor.line, col: cursor.col + 1 }),
};

for (const [key, move] of Object.entries(ARROW_HORIZONTAL)) {
  normalModeRegistry.register(key, ({ state, count }) => ({
    state: repeatCursor(state, count, move),
    actions: [{ type: 'motion', command: key, ...(count !== null ? { count } : {}) }],
  }));
}

normalModeRegistry.register('ArrowUp', ({ state, count }) =>
  verticalMotion(state, count, 'ArrowUp', -1)
);
normalModeRegistry.register('ArrowDown', ({ state, count }) =>
  verticalMotion(state, count, 'ArrowDown', 1)
);

normalModeRegistry.register('0', ({ state }) =>
  motionTo(state, '0', { line: state.cursor.line, col: 0 })
);

normalModeRegistry.register('$', ({ state }) =>
  motionTo(state, '$', {
    line: state.cursor.line,
    col: textLength(getLine(state.buffer, state.cursor.line)),
  })
);

normalModeRegistry.register('%', ({ state }) => {
  const target = matchingDelimiter(state.buffer, state.cursor);
  return motionTo(state, '%', target ?? state.cursor);
});

normalModeRegistry.register('w', ({ state, count }) => ({
  state: repeatWordMotion(state, count, nextWordStart),
  actions: [{ type: 'motion', command: 'w', ...(count !== null ? { count } : {}) }],
}));

normalModeRegistry.register('b', ({ state, count }) => ({
  state: repeatWordMotion(state, count, prevWordStart),
  actions: [{ type: 'motion', command: 'b', ...(count !== null ? { count } : {}) }],
}));

// `G` jumps to the last line by default; `{n}G` jumps to the 1-based line `n`.
normalModeRegistry.register('G', ({ state, count }) => {
  const targetLine = count === null ? lineCount(state.buffer) - 1 : count - 1;
  return {
    state: moveCursor(state, { line: targetLine, col: 0 }),
    actions: [{ type: 'motion', command: 'G', ...(count !== null ? { count } : {}) }],
  };
});

// `gg` is a two-key sequence: the first `g` sets a pending prefix (kept by
// dispatch via `pending`), the second resolves it.
normalModeRegistry.register('g', ({ state }) => {
  if (state.pendingOperator === 'g') {
    return {
      state: moveCursor(state, { line: 0, col: 0 }),
      actions: [{ type: 'motion', command: 'gg' }],
    };
  }
  return { state: { ...state, pendingOperator: 'g' }, pending: true };
});
