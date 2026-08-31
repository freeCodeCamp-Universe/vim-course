import type { Buffer, Cursor, TerrainRules } from './types';
import { textAt, textChars, textLength } from './text';

/** Commands that move vertically (same column across rows). */
const VERTICAL_COMMANDS = new Set(['j', 'k', 'G', 'gg']);

/**
 * Whether `command` may move from `from` to `to` in `buffer` under `rules`.
 *
 * The path between two positions depends on the command family:
 *
 * - **Same line** — the column span from `from` to `to`, excluding the origin
 *   cell and including the target.
 * - **Different line, vertical command** (`j`, `k`, `G`, `gg`) — the cells at
 *   the moving column across the crossed rows, excluding the origin row and
 *   including the target row.
 * - **Different line, otherwise** (`w`, `b`) — a walk in buffer reading order
 *   between the two positions, excluding the origin and including the target.
 *
 * A cell blocks when its character appears in `rules` and `command` is not in
 * that glyph's permitted set. Characters absent from `rules` are ordinary text
 * and never block.
 */
export function canTraverse(
  buffer: Buffer,
  from: Cursor,
  to: Cursor,
  command: string,
  rules: TerrainRules
): boolean {
  if (rules.size === 0) {
    return true;
  }

  const path = derivePath(buffer, from, to, command);
  return path.every((ch) => {
    const permitted = rules.get(ch);
    return permitted === undefined || permitted.has(command);
  });
}

/**
 * Collect the characters along the path the cursor travels, excluding the
 * origin cell and including the target cell.
 */
function derivePath(buffer: Buffer, from: Cursor, to: Cursor, command: string): string[] {
  if (from.line === to.line && from.col === to.col) {
    return [];
  }

  if (from.line === to.line) {
    return sameLinePath(buffer, from.line, from.col, to.col);
  }

  if (VERTICAL_COMMANDS.has(command)) {
    return verticalPath(buffer, from, to);
  }

  return readingOrderPath(buffer, from, to);
}

/** Columns between `fromCol` (exclusive) and `toCol` (inclusive) on one line. */
function sameLinePath(buffer: Buffer, line: number, fromCol: number, toCol: number): string[] {
  const rowChars = textChars(buffer[line] ?? '');
  const result: string[] = [];
  const step = toCol > fromCol ? 1 : -1;

  for (let col = fromCol + step; step > 0 ? col <= toCol : col >= toCol; col += step) {
    result.push(rowChars[col] ?? ' ');
  }

  return result;
}

/** Cells at the moving column across crossed rows (vertical motions). */
function verticalPath(buffer: Buffer, from: Cursor, to: Cursor): string[] {
  const chars: string[] = [];
  const step = to.line > from.line ? 1 : -1;

  for (let line = from.line + step; step > 0 ? line <= to.line : line >= to.line; line += step) {
    const row = buffer[line] ?? '';
    // Vertical motions land at the same column (clamped), but terrain checks
    // the target column on each crossed row — the column the cursor will
    // occupy there.
    const col = Math.min(to.col, Math.max(0, textLength(row) - 1));
    chars.push(textAt(row, col) ?? ' ');
  }

  return chars;
}

/** Walk in buffer reading order between two positions. */
function readingOrderPath(buffer: Buffer, from: Cursor, to: Cursor): string[] {
  // Normalize so `start` comes before `end` in reading order.
  const forward = from.line < to.line || (from.line === to.line && from.col < to.col);
  const start = forward ? from : to;
  const end = forward ? to : from;

  const result: string[] = [];
  let line = start.line;
  let col = start.col;
  let rowChars = textChars(buffer[line] ?? '');

  // Advance one cell past start.
  col += 1;
  if (col > rowChars.length) {
    line += 1;
    col = 0;
    rowChars = textChars(buffer[line] ?? '');
  }

  while (line < end.line || (line === end.line && col <= end.col)) {
    if (col < rowChars.length) {
      result.push(rowChars[col]);
    }
    col += 1;
    if (col > rowChars.length) {
      line += 1;
      col = 0;
      rowChars = textChars(buffer[line] ?? '');
    }
  }

  return result;
}
