import { deleteChar, deleteLine, getLine } from '../buffer';
import { normalModeRegistry, type CommandResult } from '../registry';
import { markDirty, moveCursor, setBuffer, setMode, setRegister } from '../state';
import type { Buffer, Cursor, EditorState } from '../types';
import { isReportableKey, unsupported } from '../unsupported';
import { isSingleCharacter, textAt, textChars, textLength, textSlice } from '../text';
import { resolveTextObject } from './textObjects';
import { matchingDelimiter } from './motion';

/**
 * Delete and change commands: `x`, `r`, `dd`, `dw`, `D`, `cw`, `cc`. Deleted or
 * changed text is captured in the unnamed register so `p` (Task 7) can replay
 * it. Operators (`d`/`c`) set a pending state via the registry; `dispatch`
 * routes the following key back here through `resolveOperatorMotion`, and the
 * `r` replacement char through `resolveReplace`. No counts yet (Task 10).
 */

type CharClass = 'word' | 'punct' | 'space';

/** Vim word class within a line: word chars, non-blank punctuation, or whitespace. */
function classOf(ch: string): CharClass {
  if (ch === ' ' || ch === '\t') {
    return 'space';
  }
  return /[A-Za-z0-9_]/.test(ch) ? 'word' : 'punct';
}

/**
 * Exclusive end column for `dw`: the current word plus its trailing whitespace,
 * up to the next word start. Stops at end of line rather than crossing to the
 * next line, matching Vim's `dw` line exception.
 */
function nextWordCol(text: string, col: number): number {
  const chars = textChars(text);
  if (col >= chars.length) {
    return chars.length;
  }
  let i = col;
  const startClass = classOf(chars[i]);
  if (startClass !== 'space') {
    while (i < chars.length && classOf(chars[i]) === startClass) {
      i++;
    }
  }
  while (i < chars.length && classOf(chars[i]) === 'space') {
    i++;
  }
  return i;
}

/**
 * Exclusive end column for `cw`: the end of the current word only, without its
 * trailing whitespace. `cw` behaves like `ce`, Vim's documented special case.
 */
function wordEndCol(text: string, col: number): number {
  const chars = textChars(text);
  if (col >= chars.length) {
    return col;
  }
  let i = col;
  const cls = classOf(chars[i]);
  while (i < chars.length && classOf(chars[i]) === cls) {
    i++;
  }
  return i;
}

/** Return two cursors in document order (earlier first). */
function orderedCursors(a: Cursor, b: Cursor): [Cursor, Cursor] {
  return a.line < b.line || (a.line === b.line && a.col <= b.col) ? [a, b] : [b, a];
}

/** Extract the text in an inclusive charwise range, joining lines with `\n`. */
function extractCharwiseRange(buffer: Buffer, start: Cursor, end: Cursor): string {
  if (start.line === end.line) {
    return textSlice(getLine(buffer, start.line), start.col, end.col + 1);
  }
  const head = textSlice(getLine(buffer, start.line), start.col);
  const tail = textSlice(getLine(buffer, end.line), 0, end.col + 1);
  return [head, ...buffer.slice(start.line + 1, end.line), tail].join('\n');
}

/** Remove an inclusive charwise range from the buffer, joining surviving ends. */
function removeCharwiseRange(buffer: Buffer, start: Cursor, end: Cursor): Buffer {
  const next = buffer.slice();
  if (start.line === end.line) {
    const text = getLine(buffer, start.line);
    next[start.line] = textSlice(text, 0, start.col) + textSlice(text, end.col + 1);
    return next;
  }
  const head = textSlice(getLine(buffer, start.line), 0, start.col);
  const tail = textSlice(getLine(buffer, end.line), end.col + 1);
  next.splice(start.line, end.line - start.line + 1, head + tail);
  return next;
}

/** Operators awaiting a motion/text-object; `dispatch` intercepts their follow-up key. */
export const EDIT_OPERATORS = new Set(['d', 'c']);

function pendingCount(state: EditorState): number {
  if (state.pendingCount === '') {
    return 1;
  }
  return Math.max(1, Number.parseInt(state.pendingCount, 10));
}

function deleteLineOp(state: EditorState): CommandResult {
  const { line } = state.cursor;
  const count = pendingCount(state);
  const maxRemovals = Math.min(count, state.buffer.length - line);
  let buffer = state.buffer;
  const removedLines: string[] = [];
  for (let i = 0; i < maxRemovals; i += 1) {
    removedLines.push(getLine(buffer, line));
    buffer = deleteLine(buffer, line);
  }
  const removed = removedLines.join('\n');
  const next = setBuffer(setRegister(markDirty(state), { text: removed, linewise: true }), buffer);
  const targetLine = Math.min(line, buffer.length - 1);
  return {
    state: moveCursor(next, { line: targetLine, col: 0 }),
    actions: [{ type: 'edit', command: 'dd', ...(count > 1 ? { count } : {}) }],
  };
}

function changeLineOp(state: EditorState): CommandResult {
  const { line } = state.cursor;
  const count = pendingCount(state);
  const buffer = state.buffer.slice();
  const maxRemovals = Math.min(count, buffer.length - line);
  const removedLines = buffer.slice(line, line + maxRemovals);
  buffer.splice(line, maxRemovals, '');
  const removed = removedLines.join('\n');
  const next = setBuffer(
    setRegister(setMode(markDirty(state), 'insert'), { text: removed, linewise: true }),
    buffer
  );
  return {
    state: moveCursor(next, { line, col: 0 }),
    actions: [{ type: 'edit', command: 'cc', ...(count > 1 ? { count } : {}) }],
  };
}

function deleteWordOp(state: EditorState): CommandResult {
  const { line, col } = state.cursor;
  const count = pendingCount(state);
  const text = getLine(state.buffer, line);
  let end = col;
  for (let i = 0; i < count; i += 1) {
    end = nextWordCol(text, end);
  }
  const removed = textSlice(text, col, end);
  const buffer = state.buffer.slice();
  buffer[line] = textSlice(text, 0, col) + textSlice(text, end);
  const next = setBuffer(setRegister(markDirty(state), { text: removed, linewise: false }), buffer);
  return {
    state: moveCursor(next, { line, col }),
    actions: [{ type: 'edit', command: 'dw', ...(count > 1 ? { count } : {}) }],
  };
}

function changeWordOp(state: EditorState): CommandResult {
  const { line, col } = state.cursor;
  const count = pendingCount(state);
  const text = getLine(state.buffer, line);
  let end = col;
  for (let i = 0; i < count; i += 1) {
    end = nextWordCol(text, end);
  }
  if (count === 1) {
    end = wordEndCol(text, col);
  }
  const removed = textSlice(text, col, end);
  const buffer = state.buffer.slice();
  buffer[line] = textSlice(text, 0, col) + textSlice(text, end);
  const next = setBuffer(
    setRegister(setMode(markDirty(state), 'insert'), { text: removed, linewise: false }),
    buffer
  );
  return {
    state: moveCursor(next, { line, col }),
    actions: [{ type: 'edit', command: 'cw', ...(count > 1 ? { count } : {}) }],
  };
}

function deletePercentOp(state: EditorState): CommandResult {
  const target = matchingDelimiter(state.buffer, state.cursor);
  if (target === null) {
    return { state, actions: [] };
  }
  const [start, end] = orderedCursors(state.cursor, target);
  const removed = extractCharwiseRange(state.buffer, start, end);
  const buffer = removeCharwiseRange(state.buffer, start, end);
  const next = setBuffer(setRegister(markDirty(state), { text: removed, linewise: false }), buffer);
  return {
    state: moveCursor(next, { line: start.line, col: start.col }),
    actions: [{ type: 'edit', command: 'd%' }],
  };
}

function changePercentOp(state: EditorState): CommandResult {
  const target = matchingDelimiter(state.buffer, state.cursor);
  if (target === null) {
    return { state, actions: [] };
  }
  const [start, end] = orderedCursors(state.cursor, target);
  const removed = extractCharwiseRange(state.buffer, start, end);
  const buffer = removeCharwiseRange(state.buffer, start, end);
  const next = setBuffer(
    setRegister(setMode(markDirty(state), 'insert'), { text: removed, linewise: false }),
    buffer
  );
  return {
    state: moveCursor(next, { line: start.line, col: start.col }),
    actions: [{ type: 'edit', command: 'c%' }],
  };
}

/**
 * Complete a pending `d`/`c` operator with its follow-up key. The doubled
 * operator key (`dd`/`cc`) is linewise; `w` is the word motion; `%` jumps to
 * the matching delimiter and deletes/changes the range; any other key cancels
 * the operator, reporting the whole attempted sequence (`d$`) as unsupported so
 * the learner sees why nothing happened.
 */
export function resolveOperatorMotion(state: EditorState, key: string): CommandResult {
  const op = state.pendingOperator;
  if (state.pendingTextObject === 'i') {
    return resolveTextObject(state, key);
  }
  if (key === 'i') {
    return { state: { ...state, pendingTextObject: 'i' }, pending: true };
  }
  if (key === op) {
    return op === 'd' ? deleteLineOp(state) : changeLineOp(state);
  }
  if (key === 'w') {
    return op === 'd' ? deleteWordOp(state) : changeWordOp(state);
  }
  if (key === '%') {
    return op === 'd' ? deletePercentOp(state) : changePercentOp(state);
  }
  return isReportableKey(key) ? unsupported(state, `${op}${key}`) : { state, actions: [] };
}

/**
 * Complete a pending `r` by replacing the character under the cursor and staying
 * in normal mode. A non-printable follow-up key cancels with no change.
 */
export function resolveReplace(state: EditorState, key: string): CommandResult {
  const { line, col } = state.cursor;
  const text = getLine(state.buffer, line);
  if (!isSingleCharacter(key) || textLength(text) === 0) {
    return { state, actions: [] };
  }
  const buffer = state.buffer.slice();
  buffer[line] = textSlice(text, 0, col) + key + textSlice(text, col + 1);
  const next = setBuffer(markDirty(state), buffer);
  return { state: moveCursor(next, { line, col }), actions: [{ type: 'edit', command: 'r' }] };
}

normalModeRegistry.register('x', ({ state }) => {
  const { line, col } = state.cursor;
  const text = getLine(state.buffer, line);
  if (textLength(text) === 0) {
    return { state, actions: [] };
  }
  const removed = textAt(text, col) ?? '';
  const buffer = deleteChar(state.buffer, line, col);
  const next = setBuffer(setRegister(markDirty(state), { text: removed, linewise: false }), buffer);
  return { state: next, actions: [{ type: 'edit', command: 'x' }] };
});

normalModeRegistry.register('D', ({ state }) => {
  const { line, col } = state.cursor;
  const text = getLine(state.buffer, line);
  if (col >= textLength(text)) {
    return { state, actions: [] };
  }
  const removed = textSlice(text, col);
  const buffer = state.buffer.slice();
  buffer[line] = textSlice(text, 0, col);
  const next = setBuffer(setRegister(markDirty(state), { text: removed, linewise: false }), buffer);
  return { state: moveCursor(next, { line, col }), actions: [{ type: 'edit', command: 'D' }] };
});

// `r` and the operators set a pending prefix; dispatch feeds the next key back
// to `resolveReplace` / `resolveOperatorMotion`.
normalModeRegistry.register('r', ({ state }) => ({
  state: { ...state, pendingOperator: 'r', pendingTextObject: null },
  pending: true,
}));
normalModeRegistry.register('d', ({ state }) => ({
  state: { ...state, pendingOperator: 'd', pendingTextObject: null },
  pending: true,
}));
normalModeRegistry.register('c', ({ state }) => ({
  state: { ...state, pendingOperator: 'c', pendingTextObject: null },
  pending: true,
}));
