import type { Buffer, Cursor } from './types';
import { textLength, textSlice } from './text';

/**
 * A buffer always holds at least one line, mirroring Vim (an "empty" file is a
 * single empty line). All helpers here are pure: they return a new buffer or a
 * new cursor and never mutate their arguments.
 */

export function normalizeBuffer(lines: readonly string[]): Buffer {
  return lines.length > 0 ? [...lines] : [''];
}

export function lineCount(buffer: Buffer): number {
  return buffer.length;
}

export function clampLine(buffer: Buffer, line: number): number {
  return Math.max(0, Math.min(line, buffer.length - 1));
}

/**
 * Clamp a column to the given line. In normal mode the cursor rests on a
 * character, so the max column is the last character (`length - 1`); `allowEnd`
 * (insert mode) permits resting one past the last character.
 */
export function clampCol(buffer: Buffer, line: number, col: number, allowEnd = false): number {
  const text = buffer[clampLine(buffer, line)] ?? '';
  const max = allowEnd ? textLength(text) : Math.max(0, textLength(text) - 1);
  return Math.max(0, Math.min(col, max));
}

export function clampCursor(buffer: Buffer, cursor: Cursor, allowEnd = false): Cursor {
  const line = clampLine(buffer, cursor.line);
  const col = clampCol(buffer, line, cursor.col, allowEnd);
  return { line, col };
}

export function getLine(buffer: Buffer, line: number): string {
  return buffer[clampLine(buffer, line)] ?? '';
}

function replaceLine(buffer: Buffer, line: number, text: string): Buffer {
  const next = buffer.slice();
  next[line] = text;
  return next;
}

export function insertChar(buffer: Buffer, line: number, col: number, ch: string): Buffer {
  const idx = clampLine(buffer, line);
  const text = buffer[idx];
  const at = Math.max(0, Math.min(col, textLength(text)));
  return replaceLine(buffer, idx, textSlice(text, 0, at) + ch + textSlice(text, at));
}

export function deleteChar(buffer: Buffer, line: number, col: number): Buffer {
  const idx = clampLine(buffer, line);
  const text = buffer[idx];
  if (textLength(text) === 0) {
    return buffer.slice();
  }
  const at = Math.max(0, Math.min(col, textLength(text) - 1));
  return replaceLine(buffer, idx, textSlice(text, 0, at) + textSlice(text, at + 1));
}

export function splitLine(buffer: Buffer, line: number, col: number): Buffer {
  const idx = clampLine(buffer, line);
  const text = buffer[idx];
  const at = Math.max(0, Math.min(col, textLength(text)));
  const next = buffer.slice();
  next.splice(idx, 1, textSlice(text, 0, at), textSlice(text, at));
  return next;
}

/** Join the line at `line` with the line below it. No-op on the last line. */
export function joinLines(buffer: Buffer, line: number): Buffer {
  const idx = clampLine(buffer, line);
  if (idx >= buffer.length - 1) {
    return buffer.slice();
  }
  const next = buffer.slice();
  next.splice(idx, 2, next[idx] + next[idx + 1]);
  return next;
}

export function insertLine(buffer: Buffer, index: number, text = ''): Buffer {
  const at = Math.max(0, Math.min(index, buffer.length));
  const next = buffer.slice();
  next.splice(at, 0, text);
  return next;
}

/**
 * Insert a (possibly multi-line) string at the given position. Newlines in
 * `text` split the current line and produce new buffer lines, mirroring how a
 * system-clipboard paste works. Returns the updated buffer and the cursor
 * position at the end of the inserted text.
 */
export function insertText(
  buffer: Buffer,
  line: number,
  col: number,
  text: string
): { buffer: Buffer; cursor: Cursor } {
  const idx = clampLine(buffer, line);
  const currentLine = buffer[idx];
  const at = Math.max(0, Math.min(col, textLength(currentLine)));

  const before = textSlice(currentLine, 0, at);
  const after = textSlice(currentLine, at);
  const fragments = text.split('\n');

  if (fragments.length === 1) {
    const next = buffer.slice();
    next[idx] = before + fragments[0] + after;
    return { buffer: next, cursor: { line: idx, col: at + textLength(fragments[0]) } };
  }

  const newLines: string[] = [before + fragments[0]];
  for (let i = 1; i < fragments.length - 1; i++) {
    newLines.push(fragments[i]);
  }
  const lastFragment = fragments[fragments.length - 1];
  newLines.push(lastFragment + after);

  const next = buffer.slice();
  next.splice(idx, 1, ...newLines);

  return {
    buffer: next,
    cursor: { line: idx + fragments.length - 1, col: textLength(lastFragment) },
  };
}

/** Delete a line. Deleting the only line leaves a single empty line, as in Vim. */
export function deleteLine(buffer: Buffer, index: number): Buffer {
  if (buffer.length <= 1) {
    return [''];
  }
  const at = clampLine(buffer, index);
  const next = buffer.slice();
  next.splice(at, 1);
  return next;
}
