import { getLine } from '../buffer';
import { markDirty, moveCursor, setBuffer, setMode, setRegister } from '../state';
import type { EditorState } from '../types';
import type { CommandResult } from '../registry';
import { isReportableKey, unsupported } from '../unsupported';
import { textChars, textSlice } from '../text';

interface TextRange {
  start: number;
  end: number;
}

function isWordChar(ch: string | undefined): boolean {
  return ch !== undefined && /[A-Za-z0-9_]/.test(ch);
}

function findInnerWordRange(line: string, col: number): TextRange | null {
  const chars = textChars(line);
  if (col < 0 || col >= chars.length || !isWordChar(chars[col])) {
    return null;
  }

  let start = col;
  while (start > 0 && isWordChar(chars[start - 1])) {
    start -= 1;
  }

  let end = col + 1;
  while (end < chars.length && isWordChar(chars[end])) {
    end += 1;
  }

  return { start, end };
}

function findInnerQuoteRange(line: string, col: number): TextRange | null {
  const left = line.lastIndexOf('"', col - 1);
  const right = line.indexOf('"', col);
  if (left < 0 || right < 0 || left >= col || right <= col) {
    return null;
  }
  return { start: left + 1, end: right };
}

function findInnerParenRange(line: string, col: number): TextRange | null {
  const chars = textChars(line);
  const stack: number[] = [];
  let best: TextRange | null = null;

  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i];
    if (ch === '(') {
      stack.push(i);
      continue;
    }

    if (ch === ')' && stack.length > 0) {
      const open = stack.pop() as number;
      if (open < col && col < i && (best === null || open > best.start - 1)) {
        best = { start: open + 1, end: i };
      }
    }
  }

  return best;
}

function resolveInnerRange(state: EditorState, objectKey: string): TextRange | null {
  const { line, col } = state.cursor;
  const text = getLine(state.buffer, line);

  if (objectKey === 'w') {
    return findInnerWordRange(text, col);
  }
  if (objectKey === '"') {
    return findInnerQuoteRange(text, col);
  }
  if (objectKey === '(') {
    return findInnerParenRange(text, col);
  }
  return null;
}

function applyDelete(state: EditorState, range: TextRange, command: string): CommandResult {
  const { line } = state.cursor;
  const text = getLine(state.buffer, line);
  const removed = textSlice(text, range.start, range.end);
  const buffer = state.buffer.slice();
  buffer[line] = textSlice(text, 0, range.start) + textSlice(text, range.end);

  let next = setBuffer(state, buffer);
  if (removed.length > 0) {
    next = setRegister(markDirty(next), { text: removed, linewise: false });
  }

  return {
    state: moveCursor(next, { line, col: range.start }),
    actions: [{ type: 'edit', command }],
  };
}

function applyChange(state: EditorState, range: TextRange, command: string): CommandResult {
  const deleted = applyDelete(state, range, command);

  return {
    state: setMode(deleted.state, 'insert'),
    actions: deleted.actions,
  };
}

const INNER_OBJECTS = new Set(['w', '"', '(']);

/**
 * Resolve `i` text objects for pending `d`/`c` operators (`iw`, `i"`, `i(`).
 * An object this course does not simulate (`di]`) says so; one it does, with the
 * cursor outside it, is a silent no-op as in Vim.
 */
export function resolveTextObject(state: EditorState, objectKey: string): CommandResult {
  const op = state.pendingOperator;
  if (op !== 'd' && op !== 'c') {
    return { state, actions: [] };
  }

  if (!INNER_OBJECTS.has(objectKey)) {
    return isReportableKey(objectKey)
      ? unsupported(state, `${op}i${objectKey}`)
      : { state, actions: [] };
  }

  const range = resolveInnerRange(state, objectKey);
  if (range === null) {
    return { state, actions: [] };
  }

  const suffix = `i${objectKey}`;
  if (op === 'd') {
    return applyDelete(state, range, `d${suffix}`);
  }
  return applyChange(state, range, `c${suffix}`);
}
