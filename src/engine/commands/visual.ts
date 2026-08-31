import type { Action } from '../actionHistory';
import { deleteLine, getLine } from '../buffer';
import { ARROW_KEYS, ESCAPE_KEYS } from '../keys';
import { normalModeRegistry, type CommandResult, type Registry } from '../registry';
import {
  markDirty,
  moveCursor,
  setBuffer,
  setError,
  setMode,
  setRegister,
  setStatus,
} from '../state';
import type { AllowedCommands } from '../dispatch';
import type { Buffer, Cursor, EditorState, Mode } from '../types';
import {
  isReportableKey,
  unsupported,
  unsupportedInMode,
  unsupportedMessage,
} from '../unsupported';
import { textLength, textSlice } from '../text';

/**
 * Visual mode: `v` and `V` mark an arbitrary range, and `d`/`x`/`y`/`c` act on
 * exactly that range instead of on a fixed scope. The range is the pair
 * (`state.visualAnchor`, `state.cursor`), so every motion the course teaches
 * extends the selection for free — `dispatch` routes a visual-mode key here, and
 * this module hands the motions back to the normal-mode registry.
 */

/** Operators that consume a selection; every other operator key is refused here. */
const VISUAL_OPERATORS = new Set(['d', 'x', 'y', 'c']);

export function isVisualMode(mode: Mode): boolean {
  return mode === 'visual' || mode === 'visual-line';
}

export interface VisualSelection {
  /** The first selected position, inclusive. */
  start: Cursor;
  /** The last selected position, inclusive — the character under it is selected. */
  end: Cursor;
  /** True in visual-line mode, where whole lines are selected regardless of column. */
  linewise: boolean;
}

function ordered(a: Cursor, b: Cursor): [Cursor, Cursor] {
  const aFirst = a.line < b.line || (a.line === b.line && a.col <= b.col);
  return aFirst ? [a, b] : [b, a];
}

/**
 * The live selection: the anchor and the cursor ordered, both ends inclusive. In
 * visual-line mode the columns are widened to the full lines, so callers never
 * need to know which visual mode produced the range. Null outside visual mode.
 */
export function visualSelection(state: EditorState): VisualSelection | null {
  if (!isVisualMode(state.mode) || state.visualAnchor === null) {
    return null;
  }

  const [first, last] = ordered(state.visualAnchor, state.cursor);
  if (state.mode !== 'visual-line') {
    return { start: first, end: last, linewise: false };
  }

  return {
    start: { line: first.line, col: 0 },
    end: { line: last.line, col: Math.max(0, textLength(getLine(state.buffer, last.line)) - 1) },
    linewise: true,
  };
}

/** The selected text, joined with newlines when the range spans lines. */
function selectedText(buffer: Buffer, selection: VisualSelection): string {
  const { start, end, linewise } = selection;

  if (linewise) {
    return buffer.slice(start.line, end.line + 1).join('\n');
  }

  if (start.line === end.line) {
    return textSlice(getLine(buffer, start.line), start.col, end.col + 1);
  }

  const head = textSlice(getLine(buffer, start.line), start.col);
  const tail = textSlice(getLine(buffer, end.line), 0, end.col + 1);
  return [head, ...buffer.slice(start.line + 1, end.line), tail].join('\n');
}

/** Cut a charwise range out, joining the surviving halves when it spans lines. */
function removeCharwise(buffer: Buffer, selection: VisualSelection): Buffer {
  const { start, end } = selection;
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

/** Drop the selected lines entirely; removing every line leaves one empty line. */
function removeLinewise(buffer: Buffer, selection: VisualSelection): Buffer {
  let next = buffer;
  const removals = selection.end.line - selection.start.line + 1;
  for (let i = 0; i < removals; i += 1) {
    next = deleteLine(next, selection.start.line);
  }
  return next;
}

/** Leave visual mode for normal mode, dropping the anchor. */
function exitVisual(state: EditorState, actions: Action[] = []): CommandResult {
  return { state: { ...setMode(state, 'normal'), visualAnchor: null }, actions };
}

function enterVisual(state: EditorState, mode: Mode, command: string): CommandResult {
  return {
    state: { ...setMode(state, mode), visualAnchor: state.cursor },
    actions: [{ type: 'mode', command }],
  };
}

/**
 * `v` and `V` pressed while a selection is live. Pressing the key that started the
 * selection ends it; the other key keeps the anchor and switches granularity, so
 * `vV` widens a character selection to whole lines.
 */
function switchVisual(state: EditorState, key: string): CommandResult {
  const target: Mode = key === 'v' ? 'visual' : 'visual-line';
  if (state.mode === target) {
    return exitVisual(state, [{ type: 'mode', command: key }]);
  }
  return { state: setMode(state, target), actions: [{ type: 'mode', command: key }] };
}

/**
 * `d` (and its `x` alias) on a selection. The removed text lands in the unnamed
 * register with the selection's own granularity, so a linewise selection pastes
 * back as lines. The cursor settles on the start of what was removed.
 */
function deleteSelection(
  state: EditorState,
  selection: VisualSelection,
  command: string
): CommandResult {
  const text = selectedText(state.buffer, selection);
  // A charwise selection on an empty line covers nothing; deleting it would only
  // mark the file modified. Vim beeps, so leave visual mode and record nothing.
  if (!selection.linewise && text === '') {
    return exitVisual(state);
  }

  const buffer = selection.linewise
    ? removeLinewise(state.buffer, selection)
    : removeCharwise(state.buffer, selection);
  const registered = setRegister(markDirty(state), { text, linewise: selection.linewise });
  const next = setBuffer({ ...registered, mode: 'normal', visualAnchor: null }, buffer);
  const line = selection.linewise
    ? Math.min(selection.start.line, buffer.length - 1)
    : selection.start.line;
  const col = selection.linewise ? 0 : selection.start.col;

  return { state: moveCursor(next, { line, col }), actions: [{ type: 'edit', command }] };
}

/** `y` on a selection: fill the register, leave the buffer alone, return to the start. */
function yankSelection(state: EditorState, selection: VisualSelection): CommandResult {
  const text = selectedText(state.buffer, selection);
  const registered = setRegister(state, { text, linewise: selection.linewise });
  const { state: normal } = exitVisual(registered);
  const col = selection.linewise ? 0 : selection.start.col;

  return {
    state: moveCursor(normal, { line: selection.start.line, col }),
    actions: [{ type: 'edit', command: 'y' }],
  };
}

/**
 * `c` on a selection: delete it and drop into insert mode where it began. A
 * linewise selection collapses to a single empty line to type into, matching
 * `cc`; a charwise one leaves the surrounding text in place.
 */
function changeSelection(state: EditorState, selection: VisualSelection): CommandResult {
  const text = selectedText(state.buffer, selection);
  let buffer: Buffer;
  if (selection.linewise) {
    buffer = state.buffer.slice();
    buffer.splice(selection.start.line, selection.end.line - selection.start.line + 1, '');
  } else {
    buffer = removeCharwise(state.buffer, selection);
  }

  const registered = setRegister(markDirty(state), { text, linewise: selection.linewise });
  const insert = setMode({ ...registered, visualAnchor: null }, 'insert');
  const next = setBuffer(insert, buffer);
  const col = selection.linewise ? 0 : selection.start.col;

  return {
    state: moveCursor(next, { line: selection.start.line, col }),
    actions: [{ type: 'edit', command: 'c' }],
  };
}

function applyOperator(state: EditorState, key: string, selection: VisualSelection): CommandResult {
  if (key === 'y') {
    return yankSelection(state, selection);
  }
  if (key === 'c') {
    return changeSelection(state, selection);
  }
  return deleteSelection(state, selection, key);
}

export interface VisualKeyOptions {
  /** Where motions are looked up; visual mode reuses the normal-mode handlers. */
  registry: Registry;
  /** The resolved count prefix, passed through to a motion handler. */
  count: number | null;
  /** A lesson's command filter, when it declares one. */
  allowedCommands?: AllowedCommands;
}

/** How the status line names the mode a key was refused in. */
function modeName(state: EditorState): string {
  return state.mode === 'visual-line' ? 'visual line mode' : 'visual mode';
}

/**
 * Process one keystroke while a visual selection is live. `Esc` cancels, `v`/`V`
 * switch or end the selection, `d`/`x`/`y`/`c` consume it, `o` swaps the ends,
 * and a motion moves the cursor end of the range. Any other key is refused
 * rather than acting on the buffer behind the selection.
 *
 * The two refusals say different things on purpose. A key the course simulates
 * nowhere (`f`) gets the same message it gets in normal mode; a key the
 * course does simulate but not here (`p`, `u`) is refused *by mode*, so the
 * learner is not told a command they were taught does not exist.
 */
export function processVisualKey(
  state: EditorState,
  key: string,
  options: VisualKeyOptions
): CommandResult {
  if (ESCAPE_KEYS.has(key)) {
    return exitVisual(state, [{ type: 'mode', command: 'Escape' }]);
  }

  const selection = visualSelection(state);
  // A visual mode with no anchor is not a selection anyone can act on; fall back
  // to normal mode rather than letting operators run against a missing range.
  if (selection === null) {
    return exitVisual(state);
  }

  const verdict =
    options.allowedCommands !== undefined && !ARROW_KEYS.has(key)
      ? options.allowedCommands(key, options.count ?? 1, state.history)
      : true;
  const blocked = verdict !== true;
  const filtered: CommandResult = {
    state:
      verdict !== true && verdict.message
        ? setStatus(state, verdict.message)
        : setError(state, unsupportedMessage(key, state.unsupportedMessage)),
    actions: [{ type: 'filtered', command: key }],
  };

  if (key === 'v' || key === 'V') {
    return blocked ? filtered : switchVisual(state, key);
  }

  if (VISUAL_OPERATORS.has(key)) {
    return blocked ? filtered : applyOperator(state, key, selection);
  }

  if (key === 'o') {
    if (blocked) {
      return filtered;
    }
    const cursor = state.cursor;
    const anchor = state.visualAnchor;
    if (anchor === null) {
      return exitVisual(state);
    }
    return {
      state: { ...state, cursor: anchor, visualAnchor: cursor },
      actions: [{ type: 'motion', command: 'o' }],
    };
  }

  const handler = options.registry.get(key);
  if (!handler) {
    return isReportableKey(key) ? unsupported(state, key) : { state, actions: [] };
  }
  if (blocked) {
    return filtered;
  }

  const result = handler({ state, count: options.count });
  // `g` is the course's only motion prefix (`gg`). Every other pending operator
  // (`r`) has no visual-mode meaning, so it must not be left pending here.
  if (result.pending) {
    return key === 'g' ? result : unsupportedInMode(state, key, modeName(state));
  }

  // Only motions carry over: they move the free end of the selection and touch
  // nothing else. A registered key that does anything more is refused by mode,
  // since it works perfectly well in normal mode.
  const actions = result.actions ?? [];
  if (actions.length === 0 || !actions.every((action) => action.type === 'motion')) {
    return unsupportedInMode(state, key, modeName(state));
  }
  return result;
}

normalModeRegistry.register('v', ({ state }) => enterVisual(state, 'visual', 'v'));
normalModeRegistry.register('V', ({ state }) => enterVisual(state, 'visual-line', 'V'));
