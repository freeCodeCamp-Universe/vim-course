import { moveCursor, setBuffer } from './state';
import type { EditorState, Snapshot } from './types';

/**
 * The undo/redo history. `dispatch` records a snapshot before each mutating
 * command (and once per insert session), so `u` and `Ctrl-r` walk between the
 * two stacks. Snapshots capture buffer + cursor only; registers, mode, and the
 * action history are left untouched, matching Vim's undo semantics.
 */

/** Capture the current buffer and cursor as an independent snapshot. */
export function snapshotOf(state: EditorState): Snapshot {
  return { buffer: state.buffer.slice(), cursor: { ...state.cursor } };
}

/** Restore a captured snapshot, re-clamping the cursor to the restored buffer. */
function restore(state: EditorState, snapshot: Snapshot): EditorState {
  return moveCursor(setBuffer(state, snapshot.buffer), snapshot.cursor);
}

/**
 * Pop the newest undo snapshot and restore it, pushing the pre-undo state onto
 * the redo stack. A no-op (returns the same state) when nothing is undoable.
 */
export function applyUndo(state: EditorState): EditorState {
  if (state.undoStack.length === 0) {
    return state;
  }
  const undoStack = state.undoStack.slice();
  const previous = undoStack.pop()!;
  const redoStack = [...state.redoStack, snapshotOf(state)];
  return restore({ ...state, undoStack, redoStack }, previous);
}

/**
 * Pop the newest redo snapshot and restore it, pushing the pre-redo state back
 * onto the undo stack. A no-op when there is nothing to redo.
 */
export function applyRedo(state: EditorState): EditorState {
  if (state.redoStack.length === 0) {
    return state;
  }
  const redoStack = state.redoStack.slice();
  const next = redoStack.pop()!;
  const undoStack = [...state.undoStack, snapshotOf(state)];
  return restore({ ...state, undoStack, redoStack }, next);
}
