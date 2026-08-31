import type { Action } from '../actionHistory';
import { getLine, insertChar, insertLine, joinLines, splitLine } from '../buffer';
import { normalModeRegistry, type CommandResult } from '../registry';
import { markDirty, moveCursor, setBuffer, setMode } from '../state';
import type { Cursor, EditorState } from '../types';
import { isSingleCharacter, textLength, textSlice } from '../text';

const ESCAPE_KEYS = new Set(['Escape', 'Esc']);
const ENTER_KEYS = new Set(['Enter', 'Return']);

// Arrow keys move the cursor in insert mode too. `moveCursor` clamps to the
// insert-mode range, so the cursor may rest one past the last character.
const ARROW_MOVES: Record<string, (cursor: Cursor) => Cursor> = {
  ArrowLeft: (cursor) => ({ line: cursor.line, col: cursor.col - 1 }),
  ArrowRight: (cursor) => ({ line: cursor.line, col: cursor.col + 1 }),
  ArrowUp: (cursor) => ({ line: cursor.line - 1, col: cursor.col }),
  ArrowDown: (cursor) => ({ line: cursor.line + 1, col: cursor.col }),
};

/**
 * Leave insert mode: return to normal and step the cursor left one column, as
 * Vim does. `setMode` re-clamps the column to the normal-mode range (no resting
 * one past the last character).
 */
function exitInsert(state: EditorState): CommandResult {
  const col = Math.max(0, state.cursor.col - 1);
  const stepped = { ...state, cursor: { ...state.cursor, col } };
  return { state: setMode(stepped, 'normal'), actions: [{ type: 'mode', command: 'Escape' }] };
}

/** Split the current line at the cursor and place the cursor at the new line's start. */
function splitAtCursor(state: EditorState): CommandResult {
  const { line, col } = state.cursor;
  const buffer = splitLine(state.buffer, line, col);
  const next = moveCursor(setBuffer(markDirty(state), buffer), { line: line + 1, col: 0 });
  return { state: next, actions: [{ type: 'insert', command: 'Enter' }] };
}

/**
 * Delete backward: remove the character before the cursor, or join with the
 * previous line when at column 0. A no-op at the very start of the buffer.
 */
function deleteBackward(state: EditorState): CommandResult {
  const { line, col } = state.cursor;
  const action: Action = { type: 'insert', command: 'Backspace' };

  if (col > 0) {
    const text = getLine(state.buffer, line);
    const buffer = state.buffer.slice();
    buffer[line] = textSlice(text, 0, col - 1) + textSlice(text, col);
    return {
      state: moveCursor(setBuffer(markDirty(state), buffer), { line, col: col - 1 }),
      actions: [action],
    };
  }

  if (line > 0) {
    const prevLen = textLength(getLine(state.buffer, line - 1));
    const buffer = joinLines(state.buffer, line - 1);
    return {
      state: moveCursor(setBuffer(markDirty(state), buffer), { line: line - 1, col: prevLen }),
      actions: [action],
    };
  }

  return { state, actions: [] };
}

/**
 * Delete forward: remove the character at the cursor, or join with the next
 * line when at the end of the current line. A no-op at the very end of the buffer.
 */
function deleteForward(state: EditorState): CommandResult {
  const { line, col } = state.cursor;
  const text = getLine(state.buffer, line);
  const action: Action = { type: 'insert', command: 'Delete' };

  if (col < textLength(text)) {
    const buffer = state.buffer.slice();
    buffer[line] = textSlice(text, 0, col) + textSlice(text, col + 1);
    return {
      state: setBuffer(markDirty(state), buffer),
      actions: [action],
    };
  }

  if (line < state.buffer.length - 1) {
    const buffer = joinLines(state.buffer, line);
    return {
      state: setBuffer(markDirty(state), buffer),
      actions: [action],
    };
  }

  return { state, actions: [] };
}

/** Insert a single printable character at the cursor and advance the cursor. */
function typeChar(state: EditorState, ch: string): CommandResult {
  const { line, col } = state.cursor;
  const buffer = insertChar(state.buffer, line, col, ch);
  const next = moveCursor(setBuffer(markDirty(state), buffer), { line, col: col + 1 });
  return { state: next, actions: [{ type: 'insert', command: ch }] };
}

/**
 * Process one keystroke while the editor is in insert mode. `Esc` returns to
 * normal, `Enter` splits the line, `Backspace` deletes backward, `Delete`
 * deletes forward, arrow keys move the cursor, printable keys type, and
 * everything else (Tab, function keys) is ignored.
 */
export function processInsertKey(state: EditorState, key: string): CommandResult {
  if (ESCAPE_KEYS.has(key)) {
    return exitInsert(state);
  }
  if (ENTER_KEYS.has(key)) {
    return splitAtCursor(state);
  }
  if (key === 'Backspace') {
    return deleteBackward(state);
  }
  if (key === 'Delete') {
    return deleteForward(state);
  }
  const arrow = ARROW_MOVES[key];
  if (arrow) {
    return {
      state: moveCursor(state, arrow(state.cursor)),
      actions: [{ type: 'motion', command: key }],
    };
  }
  if (isSingleCharacter(key)) {
    return typeChar(state, key);
  }
  return { state, actions: [] };
}

normalModeRegistry.register('i', ({ state }) => ({
  state: setMode(state, 'insert'),
  actions: [{ type: 'mode', command: 'i' }],
}));

normalModeRegistry.register('a', ({ state }) => {
  const insert = setMode(state, 'insert');
  return {
    state: moveCursor(insert, { line: insert.cursor.line, col: insert.cursor.col + 1 }),
    actions: [{ type: 'mode', command: 'a' }],
  };
});

normalModeRegistry.register('A', ({ state }) => {
  const insert = setMode(state, 'insert');
  const col = textLength(getLine(insert.buffer, insert.cursor.line));
  return {
    state: moveCursor(insert, { line: insert.cursor.line, col }),
    actions: [{ type: 'mode', command: 'A' }],
  };
});

normalModeRegistry.register('o', ({ state }) => {
  const line = state.cursor.line;
  const buffer = insertLine(state.buffer, line + 1, '');
  const opened = setBuffer(setMode(markDirty(state), 'insert'), buffer);
  return {
    state: moveCursor(opened, { line: line + 1, col: 0 }),
    actions: [{ type: 'mode', command: 'o' }],
  };
});

normalModeRegistry.register('O', ({ state }) => {
  const line = state.cursor.line;
  const buffer = insertLine(state.buffer, line, '');
  const opened = setBuffer(setMode(markDirty(state), 'insert'), buffer);
  return {
    state: moveCursor(opened, { line, col: 0 }),
    actions: [{ type: 'mode', command: 'O' }],
  };
});
