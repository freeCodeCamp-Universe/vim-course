import { actionCursors, actionModes, appendActions, type Action } from './actionHistory';
import { insertText } from './buffer';
import { leaveCommandLine, processCommandLineKey } from './commandLine';
import { EDIT_OPERATORS, resolveOperatorMotion, resolveReplace } from './commands/edit';
import { processInsertKey } from './commands/insert';
import { processExplorerKey } from './explorer';
import { ARROW_KEYS, ESCAPE_KEYS } from './keys';
import { processAnimationKey } from './animation';
import { pasteShellText, processShellKey } from './shell';
import './commands/ex';
import './commands/fileInfo';
import './commands/motion';
import './commands/search';
import './commands/undo';
import { isVisualMode, processVisualKey } from './commands/visual';
import { resolveYankMotion } from './commands/yankPaste';
import { normalModeRegistry, type Registry } from './registry';
import { markDirty, moveCursor, setBuffer, setError, setMode } from './state';
import type { Buffer, EditorState } from './types';
import { textAt, textLength } from './text';
import { isReportableKey, unsupported, unsupportedMessage } from './unsupported';
import { canTraverse } from './terrain';
import { snapshotOf } from './undoStack';

/**
 * Record the pre-command cursor on each action via the side-channel WeakMap,
 * then append to history. The cursor tells checklist `atCursor` predicates
 * where the learner was when the command ran, so the predicate can match
 * atomically. The Action objects themselves stay clean, so engine tests that
 * assert on history shapes are unaffected.
 */
function appendActionsWithCursor(
  history: readonly Action[],
  actions: readonly Action[],
  cursor: { line: number; col: number },
  mode: EditorState['mode']
): Action[] {
  for (const action of actions) {
    actionCursors.set(action, cursor);
    actionModes.set(action, mode);
  }
  return appendActions(history, actions);
}

/** Keys whose handlers preserve `desiredCol` (Vim's `curswant`). */
const VERTICAL_MOTION_KEYS = new Set(['j', 'k', 'ArrowUp', 'ArrowDown']);

/**
 * The filter's answer for one resolved command: `true` to run it, or a rejection.
 * A rejection may carry a `message` for the status line — a usage cap surfaces
 * "limit reached", while an allow/deny rejection gets the standard unsupported
 * command message.
 *
 * `reason` distinguishes the rejection source so dispatch can apply different
 * policies to different classes of keys. Arrow keys bypass an `allow`-list
 * rejection (they are always navigable) but still respect `deny` and `limit`
 * rejections when a lesson explicitly forbids them.
 */
export type FilterVerdict = true | { message?: string; reason?: 'allow' | 'deny' | 'limit' };

/**
 * Predicate over a *resolved* command; commands it rejects are filtered. It is
 * called with the command a keystroke completed (`dd`, `:wq`, `/foo`), not the
 * leading key, so a lesson can permit or forbid one command without catching every
 * other command that shares its first key. A keystroke that only builds toward a
 * command (the `d` of `dd`, typing on the command line) resolves nothing and is
 * never offered to the predicate; the command it forms is judged when it completes.
 *
 * It also receives the command's resolved numeric `count` (1 when none was typed),
 * so a lesson can cap the count prefix (`maxCount`), and the `priorHistory` as it
 * stood *before* this command, so a lesson can cap how many times the command has
 * already run (`times`).
 */
export type AllowedCommands = (
  command: string,
  count: number,
  priorHistory: readonly Action[]
) => FilterVerdict;

export interface DispatchOptions {
  registry?: Registry;
  allowedCommands?: AllowedCommands;
}

export interface DispatchResult {
  state: EditorState;
  /** Actions produced by this keystroke (the delta appended to history). */
  actions: Action[];
}

const DIGIT = /^[0-9]$/;

/** How many entries constitute a "page" in the `:clist` pager. */
const QUICKFIX_PAGE = 20;
const QUICKFIX_HALF = Math.floor(QUICKFIX_PAGE / 2);
export const QUICKFIX_PAGER_HINT =
  '-- More -- SPACE/d/j: screen/page/line down, b/u/k: up, q: quit';

function clearPending(state: EditorState): EditorState {
  if (
    state.pendingOperator === null &&
    state.pendingTextObject === null &&
    state.pendingCount === ''
  ) {
    return state;
  }
  return { ...state, pendingOperator: null, pendingTextObject: null, pendingCount: '' };
}

function buffersEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && a.every((line, i) => line === b[i]);
}

/**
 * The command a keystroke *issued*, as opposed to a character it typed or a key it
 * left unresolved. This is the identity the `allowedCommands` filter judges: the
 * resolved `dd`/`:wq`/`w`, read off the action a completed command appended. Typed
 * insert-mode characters are skipped (a literal "A" is `{ type: 'insert' }`, not the
 * append command) with the one `Enter` carve-out `splitAtCursor` needs, mirroring
 * the checklist's `isIssuedCommand`. `undefined` means nothing was issued — a
 * pending prefix or a refused key — so there is nothing to filter.
 */
function issuedActionOf(actions: readonly Action[]): Action | undefined {
  return actions.find(
    (action) =>
      action.type !== 'command-line' &&
      action.type !== 'filtered' &&
      action.command !== undefined &&
      (action.type !== 'insert' || action.command === 'Enter')
  );
}

/**
 * Refuse a resolved command the lesson's filter rejected: land in `landing` (the
 * clean state the keystroke would otherwise have advanced from — pending cleared,
 * or back in normal mode from the command line), mutate nothing else, and record a
 * single `filtered` action so the runtime counts it as an attempt. A `message`
 * (from a usage-cap rejection) is written to the status line; without one, the
 * standard unsupported-command error is shown.
 */
function blockCommand(
  before: EditorState,
  landing: EditorState,
  command: string,
  message?: string
): DispatchResult {
  const actions: Action[] = [{ type: 'filtered', command }];
  const next = message
    ? setError(landing, message)
    : setError(landing, unsupportedMessage(command, landing.unsupportedMessage));
  return {
    state: {
      ...next,
      history: appendActionsWithCursor(before.history, actions, before.cursor, before.mode),
    },
    actions,
  };
}

/**
 * Apply the filter to a resolved command and, when it rejects, refuse the command
 * with the verdict's message. `command`/`count` describe what ran; `before` is the
 * pre-command state, both the source of the `priorHistory` the filter counts and the
 * state a refusal preserves; `landing` is where a refusal lands. Returns the block
 * result when rejected, or `null` when the command is allowed to proceed.
 */
function applyFilter(
  before: EditorState,
  landing: EditorState,
  command: string,
  count: number,
  allowedCommands: AllowedCommands
): DispatchResult | null {
  const verdict = allowedCommands(command, count, before.history);
  if (verdict === true) {
    return null;
  }
  return blockCommand(before, landing, command, verdict.message);
}

/**
 * Whether a filter verdict is a deny-list or limit rejection, as opposed to an
 * allow-list miss. Arrow keys use this to decide whether to honor the rejection:
 * they bypass allow-list restrictions so navigation always works, but respect
 * explicit denials and usage caps.
 */
function isDenyOrLimit(
  verdict: FilterVerdict
): verdict is { message?: string; reason?: 'deny' | 'limit' } {
  return verdict !== true && verdict.reason !== 'allow' && verdict.reason !== undefined;
}

/**
 * Record an undo point for a command that mutated the buffer or entered insert
 * mode. The snapshot is the pre-command buffer/cursor; taking it at insert
 * *entry* (rather than per typed character) collapses a whole insert session
 * into a single undo step. `undoTransparent` commands (`u`/`Ctrl-r`) manage the
 * stacks themselves and are left alone. Recording a new change clears redo.
 */
function trackUndo(before: EditorState, after: EditorState, transparent: boolean): EditorState {
  if (transparent) {
    return after;
  }
  // Switching files is not an undoable edit. Undo is per-buffer in Vim; this
  // engine keeps one global stack, so snapshotting the buffer we just left would
  // let `u` restore it into the buffer we switched to and corrupt it. Clear the
  // stacks on any switch (`:e`, `:vimgrep`/`:cnext` into another file) instead.
  if (before.activeFilePath !== after.activeFilePath) {
    return { ...after, undoStack: [], redoStack: [] };
  }
  const mutated = !buffersEqual(before.buffer, after.buffer);
  const enteringInsert = before.mode !== 'insert' && after.mode === 'insert';
  if (!mutated && !enteringInsert) {
    return after;
  }
  return { ...after, undoStack: [...after.undoStack, snapshotOf(before)], redoStack: [] };
}

/**
 * Finalize a command that consumed a pending prefix (an operator motion or an
 * `r` replacement): clear the pending state, record an undo point, and append
 * its actions to history.
 */
function completePending(
  before: EditorState,
  result: { state: EditorState; actions?: Action[] },
  allowedCommands?: AllowedCommands
): DispatchResult {
  const actions = result.actions ?? [];
  if (allowedCommands) {
    const issued = issuedActionOf(actions);
    if (issued?.command !== undefined) {
      const blocked = applyFilter(
        before,
        clearPending(before),
        issued.command,
        issued.count ?? 1,
        allowedCommands
      );
      if (blocked) {
        return blocked;
      }
    }
  }
  const cleared = { ...clearPending(result.state), desiredCol: null };
  const advanced = trackUndo(before, cleared, false);
  return {
    state: {
      ...advanced,
      history: appendActionsWithCursor(advanced.history, actions, before.cursor, before.mode),
    },
    actions,
  };
}

/**
 * Advance the editor by one keystroke. Digit keys accumulate the pending count;
 * `Esc` cancels pending operator/count; a registered key runs its handler and
 * its actions are appended to history; unknown keys are no-ops. When
 * `allowedCommands` is set (workshop mode), a rejected command mutates no
 * buffer/cursor/mode state and records only a `filtered` action.
 *
 * The startup splash needs no case of its own: it is filler over an empty
 * unnamed buffer, so its keys route through the handlers below like any other
 * normal-mode keys. Only the display flag is settled here, afterwards.
 */
export function dispatch(
  state: EditorState,
  key: string,
  options: DispatchOptions = {}
): DispatchResult {
  const result = dispatchKey(state, key, options);
  if (!state.splashVisible) {
    return result;
  }
  return {
    ...result,
    state: { ...result.state, splashVisible: splashSurvives(state, result.state) },
  };
}

/**
 * Whether the splash filler is still on screen after a keystroke. Vim's intro
 * survives keys that leave the buffer alone — `:` then `Esc`, a motion, a failed
 * command — and is wiped the moment the buffer is edited or another one is
 * loaded in its place (`:e`, `:Explore`, `:q`).
 */
function splashSurvives(before: EditorState, after: EditorState): boolean {
  return (
    buffersEqual(before.buffer, after.buffer) && before.activeFilePath === after.activeFilePath
  );
}

/** Human-readable name for the first terrain glyph that blocked a path. */
const TERRAIN_NAMES: Record<string, string> = {
  '#': 'wall',
  '~': 'water',
  '%': 'rock',
};

/**
 * Build a status message for a blocked terrain move, naming the first glyph
 * on the path that refused the command.
 */
function terrainMessage(
  buffer: Buffer,
  from: { line: number; col: number },
  to: { line: number; col: number },
  rules: Map<string, ReadonlySet<string>>
): string {
  if (from.line === to.line) {
    const row = buffer[from.line] ?? '';
    const step = to.col > from.col ? 1 : -1;
    for (let col = from.col + step; step > 0 ? col <= to.col : col >= to.col; col += step) {
      const ch = textAt(row, col) ?? ' ';
      if (rules.has(ch)) {
        const label = TERRAIN_NAMES[ch] ?? ch;
        return `the ${label} blocks you`;
      }
    }
  } else {
    const step = to.line > from.line ? 1 : -1;
    for (let line = from.line + step; step > 0 ? line <= to.line : line >= to.line; line += step) {
      const row = buffer[line] ?? '';
      const col = Math.min(to.col, Math.max(0, textLength(row) - 1));
      const ch = textAt(row, col) ?? ' ';
      if (rules.has(ch)) {
        const label = TERRAIN_NAMES[ch] ?? ch;
        return `the ${label} blocks you`;
      }
    }
  }
  return 'the terrain blocks you';
}

function dispatchKey(
  state: EditorState,
  key: string,
  options: DispatchOptions = {}
): DispatchResult {
  const registry = options.registry ?? normalModeRegistry;
  const { allowedCommands } = options;

  // A new keystroke starts a new interaction with Vim. Clear any lingering
  // status (error or informational) so it cannot hide a command-line prompt
  // or persist over the next command. Real Vim clears the status line on
  // every keypress; the prior message is a one-off acknowledgement, not a
  // permanent label.
  if (state.status) {
    state = { ...state, status: '', statusIsError: false };
  }

  // The `:clist` listing stays visible until the user explicitly quits or a
  // command executes. `q`/`Escape` close it immediately. `:` opens command-line
  // mode WITHOUT closing the listing so the user can type `:cn`/`:cp` while still
  // seeing the entries — the listing closes when Enter submits the command. While
  // the listing is up and command-line is already open, all keys flow through to
  // the command-line handler unchanged.
  //
  // Short list (≤ QUICKFIX_PAGE entries): any non-`:` key dismisses, matching
  // Vim's "Press ENTER or type command to continue" prompt.
  //
  // Long list (> QUICKFIX_PAGE entries): pager keys SPACE/d/j scroll down,
  // b/u/k scroll up. Any other key shows the hint — only `q`/Escape dismiss.
  if (state.quickfixListing) {
    if (state.mode !== 'command-line') {
      if (ESCAPE_KEYS.has(key) || key === 'q') {
        return {
          state: { ...state, quickfixListing: false, quickfixScrollOffset: 0 },
          actions: [],
        };
      }
      if (key !== ':') {
        const totalEntries = state.quickfix?.entries.length ?? 0;
        const isLongList = totalEntries > QUICKFIX_PAGE;

        if (!isLongList) {
          // Short list: any key dismisses (matches "Press ENTER or type command to continue").
          return {
            state: { ...state, quickfixListing: false, quickfixScrollOffset: 0 },
            actions: [],
          };
        }

        const offset = state.quickfixScrollOffset;
        const maxOffset = Math.max(0, totalEntries - QUICKFIX_PAGE);

        let newOffset: number | null = null;
        if (key === ' ') {
          newOffset = Math.min(maxOffset, offset + QUICKFIX_PAGE);
        } else if (key === 'd') {
          newOffset = Math.min(maxOffset, offset + QUICKFIX_HALF);
        } else if (key === 'j' || key === 'ArrowDown') {
          newOffset = Math.min(maxOffset, offset + 1);
        } else if (key === 'b') {
          newOffset = Math.max(0, offset - QUICKFIX_PAGE);
        } else if (key === 'u') {
          newOffset = Math.max(0, offset - QUICKFIX_HALF);
        } else if (key === 'k' || key === 'ArrowUp') {
          newOffset = Math.max(0, offset - 1);
        }

        if (newOffset !== null) {
          return { state: { ...state, quickfixScrollOffset: newOffset }, actions: [] };
        }

        // Unknown key: surface the pager hint in the status line.
        return { state: { ...state, status: QUICKFIX_PAGER_HINT }, actions: [] };
      }
      // `:` falls through; the handler below will enter command-line mode while
      // quickfixListing remains true.
    }
    // command-line mode: fall through so typing and Enter work normally.
  }

  // An animation owns the screen until any key dismisses it. Like the explorer
  // and shell, it is self-contained and not subject to the `allowedCommands` filter.
  if (state.mode === 'animation') {
    const result = processAnimationKey(state, key);
    const actions = result.actions ?? [];
    return {
      state: {
        ...result.state,
        history: appendActionsWithCursor(result.state.history, actions, state.cursor, state.mode),
      },
      actions,
    };
  }

  // Explorer state is self-contained: only `j`/`k`/`Enter`/`-` act, and it is
  // not subject to the workshop allow-list filter (like insert/command-line).
  // Arrow keys still respect deny-list and limit rejections so a lesson that
  // teaches hjkl can forbid them even inside the explorer.
  if (state.mode === 'explorer') {
    if (allowedCommands && ARROW_KEYS.has(key)) {
      const verdict = allowedCommands(key, 1, state.history);
      if (verdict !== true && isDenyOrLimit(verdict)) {
        return blockCommand(state, state, key, verdict.message);
      }
    }
    const result = processExplorerKey(state, key);
    const actions = result.actions ?? [];
    return {
      state: {
        ...result.state,
        history: appendActionsWithCursor(result.state.history, actions, state.cursor, state.mode),
      },
      actions,
    };
  }

  // The shell is self-contained like the explorer: only its own keys act, and it
  // is not subject to the workshop `allowedCommands` filter.
  if (state.mode === 'shell') {
    const result = processShellKey(state, key);
    const actions = result.actions ?? [];
    return {
      state: {
        ...result.state,
        history: appendActionsWithCursor(result.state.history, actions, state.cursor, state.mode),
      },
      actions,
    };
  }

  if (state.mode === 'command-line') {
    const result = processCommandLineKey(state, key);
    const actions = result.actions ?? [];
    // Typing on the command line resolves nothing (no issued command); only `Enter`
    // executes and produces an `ex`/`search` action. So the filter fires on the
    // completed command (`:wq`, `/foo`), never on the `:` that opened the mode —
    // that is why entering command-line mode is left unfiltered in the normal-mode
    // path below. A rejected command discards its effect and returns to normal.
    if (allowedCommands) {
      const issued = issuedActionOf(actions);
      if (issued?.command !== undefined) {
        const blocked = applyFilter(
          state,
          leaveCommandLine(state),
          issued.command,
          issued.count ?? 1,
          allowedCommands
        );
        if (blocked) {
          return blocked;
        }
      }
    }
    const advanced = trackUndo(state, result.state, result.undoTransparent ?? false);
    // If a command just executed while the quickfix listing was showing, close the
    // listing — the user has acted on it and the buffer should take over.
    const exOrSearch = actions.some((a) => a.type === 'ex' || a.type === 'search');
    const afterListing = state.quickfixListing && exOrSearch ? { quickfixListing: false } : {};
    return {
      state: {
        ...advanced,
        ...afterListing,
        history: appendActionsWithCursor(advanced.history, actions, state.cursor, state.mode),
      },
      actions,
    };
  }

  // Insert mode routes every key through text-entry handling, not the
  // normal-mode registry: digits type literally and `Esc` returns to normal.
  // Arrow keys in insert mode are checked against the deny list the same way
  // normal mode does: an hjkl-teaching lesson that forbids arrows blocks them
  // regardless of what mode the learner is in.
  if (state.mode === 'insert') {
    if (allowedCommands && ARROW_KEYS.has(key)) {
      const verdict = allowedCommands(key, 1, state.history);
      if (verdict !== true && isDenyOrLimit(verdict)) {
        return blockCommand(state, state, key, verdict.message);
      }
    }
    const result = processInsertKey(state, key);
    const actions = result.actions ?? [];
    return {
      state: {
        ...result.state,
        history: appendActionsWithCursor(result.state.history, actions, state.cursor, state.mode),
      },
      actions,
    };
  }

  // A live visual selection changes what the same keys mean: `d`/`y`/`c` consume
  // the selection instead of pending for a motion, and a motion moves the
  // selection's free end. `visual.ts` owns that, borrowing this registry's motions.
  if (isVisualMode(state.mode)) {
    if (DIGIT.test(key) && (key !== '0' || state.pendingCount !== '')) {
      return { state: { ...state, pendingCount: state.pendingCount + key }, actions: [] };
    }
    const count = state.pendingCount === '' ? null : Number.parseInt(state.pendingCount, 10);
    const result = processVisualKey(state, key, { registry, count, allowedCommands });
    const actions = result.actions ?? [];
    const cleared = result.pending ? result.state : clearPending(result.state);
    const advanced = trackUndo(state, cleared, false);
    return {
      state: {
        ...advanced,
        history: appendActionsWithCursor(advanced.history, actions, state.cursor, state.mode),
      },
      actions,
    };
  }

  if (ESCAPE_KEYS.has(key)) {
    return { state: clearPending(state), actions: [] };
  }

  // A pending `r` consumes the very next key as its replacement char, so it must
  // resolve before the count digits below (`r5` replaces with `5`, not a count).
  if (state.pendingOperator === 'r') {
    return completePending(state, resolveReplace(state, key), allowedCommands);
  }

  // `0` with no pending count is the start-of-line motion, not a count digit.
  if (DIGIT.test(key) && (key !== '0' || state.pendingCount !== '')) {
    return { state: { ...state, pendingCount: state.pendingCount + key }, actions: [] };
  }

  // A pending `y` (yank) resolves its follow-up here; only `yy` is in scope,
  // mirroring the doubled `d`/`c` operators.
  if (state.pendingOperator === 'y') {
    return completePending(state, resolveYankMotion(state, key), allowedCommands);
  }

  // A pending `d`/`c` operator resolves its follow-up motion here, after digit
  // accumulation so a counted motion (Task 10) can still form.
  if (state.pendingOperator !== null && EDIT_OPERATORS.has(state.pendingOperator)) {
    const result = resolveOperatorMotion(state, key);
    if (result.pending) {
      return { state: result.state, actions: result.actions ?? [] };
    }
    return completePending(state, result, allowedCommands);
  }

  const handler = registry.get(key);
  if (!handler) {
    // A key Vim knows but this course does not (`v`, `f`) says so rather
    // than doing nothing; hardware keys stay quiet. See `unsupported.ts`.
    if (!isReportableKey(key)) {
      return { state, actions: [] };
    }
    return { state: unsupported(state, key).state, actions: [] };
  }

  const count = state.pendingCount === '' ? null : Number.parseInt(state.pendingCount, 10);
  const result = handler({ state, count });
  const actions = result.actions ?? [];
  // Filter the *completed* command, not the leading key. A pending prefix (the `g`
  // of `gg`, an operator awaiting its motion) has issued nothing, so it is left to
  // build; the command it forms is judged when it resolves. A key that opens the
  // command line or search (`:`, `/`) is likewise left through here and judged on
  // execution in the command-line branch above, so the learner can still type the
  // command. Arrow keys bypass allow-list restrictions (basic navigation always
  // works) but respect deny-list and limit rejections, so a lesson can explicitly
  // forbid them when it teaches hjkl instead.
  if (allowedCommands && !result.pending && result.state.mode !== 'command-line') {
    const issued = issuedActionOf(actions);
    const command = issued?.command ?? key;
    const resolvedCount = issued?.count ?? count ?? 1;

    if (ARROW_KEYS.has(key)) {
      // Arrow keys bypass allow-list restrictions so basic navigation always
      // works, but respect deny-list and limit rejections so a lesson that
      // teaches hjkl can explicitly forbid them.
      const verdict = allowedCommands(command, resolvedCount, state.history);
      if (verdict !== true && isDenyOrLimit(verdict)) {
        return blockCommand(state, clearPending(state), command, verdict.message);
      }
    } else {
      const blocked = applyFilter(
        state,
        clearPending(state),
        command,
        resolvedCount,
        allowedCommands
      );
      if (blocked) {
        return blocked;
      }
    }
  }
  // A pending prefix (e.g. the first `g` of `gg`) keeps the pending state it set;
  // a completed command clears it.
  const afterPending = result.pending ? result.state : clearPending(result.state);
  // Vertical motions (j/k/arrows) set `desiredCol` on the state they return;
  // every other completed command clears it so horizontal moves and edits reset
  // the column memory.
  const cleared =
    !result.pending && !VERTICAL_MOTION_KEYS.has(key)
      ? { ...afterPending, desiredCol: null }
      : afterPending;

  // Terrain veto: when the buffer is a maze and the cursor moved, check
  // whether the path crosses terrain the command may not traverse. If so,
  // discard the handler's result entirely and return the pre-command state.
  if (
    state.terrain !== null &&
    !result.pending &&
    (cleared.cursor.line !== state.cursor.line || cleared.cursor.col !== state.cursor.col)
  ) {
    if (!canTraverse(state.buffer, state.cursor, cleared.cursor, key, state.terrain)) {
      const blockedActions: Action[] = [{ type: 'blocked', command: key }];
      return {
        state: {
          ...state,
          status: terrainMessage(state.buffer, state.cursor, cleared.cursor, state.terrain),
          statusIsError: false,
          history: appendActionsWithCursor(state.history, blockedActions, state.cursor, state.mode),
        },
        actions: blockedActions,
      };
    }
    // Successful move in a terrain buffer: clear sticky status so a prior
    // "blocked" message does not survive into later steps.
    if (cleared.status) {
      const advanced = trackUndo(
        state,
        { ...cleared, status: '', statusIsError: false },
        result.undoTransparent ?? false
      );
      return {
        state: {
          ...advanced,
          history: appendActionsWithCursor(advanced.history, actions, state.cursor, state.mode),
        },
        actions,
      };
    }
  }

  const advanced = trackUndo(state, cleared, result.undoTransparent ?? false);
  return {
    state: {
      ...advanced,
      history: appendActionsWithCursor(advanced.history, actions, state.cursor, state.mode),
    },
    actions,
  };
}

/**
 * Handle a system-clipboard paste (Cmd+V / Ctrl+V). The text is spliced into
 * the buffer (or command line / shell input) at the cursor, handling embedded
 * newlines. In normal mode the editor enters insert mode, pastes, then returns
 * to normal, collapsing the whole paste into one undo step.
 */
export function dispatchPaste(state: EditorState, text: string): DispatchResult {
  if (!text) {
    return { state, actions: [] };
  }

  // Strip trailing newline that many clipboard managers append.
  const cleaned = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  if (state.mode === 'insert') {
    return pasteIntoBuffer(state, cleaned);
  }

  if (state.mode === 'normal') {
    // Mimic bracketed paste: enter insert, paste, exit to normal, one undo step.
    const inserted = setMode(state, 'insert');
    const result = pasteIntoBuffer(inserted, cleaned);
    const col = Math.max(0, result.state.cursor.col - 1);
    const normal = setMode({ ...result.state, cursor: { ...result.state.cursor, col } }, 'normal');
    return { state: normal, actions: result.actions };
  }

  if (state.mode === 'command-line') {
    return pasteIntoCommandLine(state, cleaned);
  }

  if (state.mode === 'shell' && state.shell) {
    return pasteIntoShell(state, cleaned);
  }

  return { state, actions: [] };
}

/** Splice `text` into the file buffer at the cursor. */
function pasteIntoBuffer(state: EditorState, text: string): DispatchResult {
  const { buffer, cursor } = insertText(state.buffer, state.cursor.line, state.cursor.col, text);
  const next = moveCursor(setBuffer(markDirty(state), buffer), cursor);
  const actions: Action[] = [{ type: 'insert', command: 'paste' }];
  const advanced = trackUndo(state, next, false);
  return {
    state: {
      ...advanced,
      history: appendActionsWithCursor(advanced.history, actions, state.cursor, state.mode),
    },
    actions,
  };
}

/** Splice `text` into the command line at the command-line cursor. */
function pasteIntoCommandLine(state: EditorState, text: string): DispatchResult {
  // Command line is single-line; collapse newlines to spaces.
  const flat = text.replace(/\n/g, ' ');
  const cursor = state.commandLineCursor;
  const before = state.commandLine.slice(0, cursor);
  const after = state.commandLine.slice(cursor);
  return {
    state: {
      ...state,
      commandLine: before + flat + after,
      commandLineCursor: cursor + flat.length,
    },
    actions: [],
  };
}

/** Splice `text` into the shell input at the shell cursor. */
function pasteIntoShell(state: EditorState, text: string): DispatchResult {
  return { state: pasteShellText(state, text), actions: [] };
}
