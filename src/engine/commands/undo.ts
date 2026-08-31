import { normalModeRegistry, type CommandResult } from '../registry';
import type { EditorState } from '../types';
import { applyRedo, applyUndo } from '../undoStack';

/**
 * `u` (undo) and `Ctrl-r` (redo). Both manage the undo/redo stacks themselves,
 * so they return `undoTransparent: true` to tell `dispatch` not to record a
 * fresh undo point for the buffer change they cause.
 */

function historyStep(before: EditorState, after: EditorState, command: string): CommandResult {
  const changed = after !== before;
  return {
    state: after,
    actions: changed ? [{ type: 'edit', command }] : [],
    undoTransparent: true,
  };
}

normalModeRegistry.register('u', ({ state }) => historyStep(state, applyUndo(state), 'u'));
normalModeRegistry.register('Ctrl-r', ({ state }) =>
  historyStep(state, applyRedo(state), 'Ctrl-r')
);
