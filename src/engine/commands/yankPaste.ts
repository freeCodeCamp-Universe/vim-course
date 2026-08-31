import { getLine } from '../buffer';
import { normalModeRegistry, type CommandResult } from '../registry';
import { markDirty, moveCursor, setBuffer, setRegister } from '../state';
import type { EditorState } from '../types';
import { isReportableKey, unsupported } from '../unsupported';
import { textAt, textLength, textSlice } from '../text';

/**
 * Yank and paste: `yy` and `p`, sharing the unnamed register with the delete and
 * change operators (Task 6). `y` is a pending operator like `d`/`c`; `dispatch`
 * routes its follow-up key here through `resolveYankMotion`. Only `yy` (linewise)
 * is in scope for now.
 */

/** Column of the first non-blank character on a line, or 0 when blank. */
function firstNonBlankCol(text: string): number {
  const match = text.match(/\S/);
  return match ? match.index! : 0;
}

/**
 * Complete a pending `y`. The doubled key (`yy`) yanks the current line
 * linewise; any other follow-up cancels the operator, reporting the attempted
 * sequence (`yw`) as unsupported.
 */
export function resolveYankMotion(state: EditorState, key: string): CommandResult {
  if (key === 'l') {
    const text = getLine(state.buffer, state.cursor.line);
    if (textLength(text) === 0 || state.cursor.col >= textLength(text)) {
      return { state, actions: [] };
    }
    return {
      state: setRegister(state, { text: textAt(text, state.cursor.col)!, linewise: false }),
      actions: [{ type: 'edit', command: 'yl' }],
    };
  }

  if (key !== 'y') {
    return isReportableKey(key) ? unsupported(state, `y${key}`) : { state, actions: [] };
  }
  const text = getLine(state.buffer, state.cursor.line);
  return {
    state: setRegister(state, { text, linewise: true }),
    actions: [{ type: 'edit', command: 'yy' }],
  };
}

function pasteLinewise(state: EditorState, text: string): CommandResult {
  const line = state.cursor.line;
  const lines = text.split('\n');
  const buffer = state.buffer.slice();
  buffer.splice(line + 1, 0, ...lines);
  const next = setBuffer(markDirty(state), buffer);
  return {
    state: moveCursor(next, { line: line + 1, col: firstNonBlankCol(lines[0]) }),
    actions: [{ type: 'edit', command: 'p' }],
  };
}

function pasteCharwise(state: EditorState, text: string): CommandResult {
  const { line, col } = state.cursor;
  const current = getLine(state.buffer, line);
  const at = textLength(current) === 0 ? 0 : col + 1;
  const head = textSlice(current, 0, at);
  const tail = textSlice(current, at);
  const buffer = state.buffer.slice();
  const parts = text.split('\n');

  // A charwise selection can span lines (`v` plus `j`), so its register text can
  // carry newlines. Pasting it splits the line the way the copy did, and Vim
  // leaves the cursor on the first pasted character rather than the last.
  if (parts.length > 1) {
    const lines = [head + parts[0], ...parts.slice(1, -1), parts[parts.length - 1] + tail];
    buffer.splice(line, 1, ...lines);
    const next = setBuffer(markDirty(state), buffer);
    return {
      state: moveCursor(next, { line, col: at }),
      actions: [{ type: 'edit', command: 'p' }],
    };
  }

  buffer[line] = head + text + tail;
  const next = setBuffer(markDirty(state), buffer);
  return {
    state: moveCursor(next, { line, col: at + textLength(text) - 1 }),
    actions: [{ type: 'edit', command: 'p' }],
  };
}

normalModeRegistry.register('y', ({ state }) => ({
  state: { ...state, pendingOperator: 'y' },
  pending: true,
}));

normalModeRegistry.register('p', ({ state }) => {
  const register = state.register;
  if (register === null) {
    return { state, actions: [] };
  }
  return register.linewise
    ? pasteLinewise(state, register.text)
    : pasteCharwise(state, register.text);
});
