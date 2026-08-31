import { describe, expect, it } from 'vitest';

import { createState } from './state';
import type { EditorState } from './types';
import { applyRedo, applyUndo, snapshotOf } from './undoStack';

function withBuffer(
  state: EditorState,
  lines: string[],
  cursor = { line: 0, col: 0 }
): EditorState {
  return { ...state, buffer: lines, cursor };
}

describe('snapshotOf', () => {
  it('should capture an independent copy of the buffer and cursor', () => {
    const state = withBuffer(createState(), ['abc'], { line: 0, col: 2 });
    const snap = snapshotOf(state);

    snap.buffer.push('mutated');
    snap.cursor.col = 99;

    expect(state.buffer).toEqual(['abc']);
    expect(state.cursor).toEqual({ line: 0, col: 2 });
  });
});

describe('applyUndo', () => {
  it('should restore the newest undo snapshot and move it to the redo stack', () => {
    const base = withBuffer(createState(), ['edited'], { line: 0, col: 3 });
    const state: EditorState = {
      ...base,
      undoStack: [{ buffer: ['original'], cursor: { line: 0, col: 0 } }],
    };

    const undone = applyUndo(state);

    expect(undone.buffer).toEqual(['original']);
    expect(undone.cursor).toEqual({ line: 0, col: 0 });
    expect(undone.undoStack).toEqual([]);
    expect(undone.redoStack).toEqual([{ buffer: ['edited'], cursor: { line: 0, col: 3 } }]);
  });

  it('should be a no-op returning the same reference when there is nothing to undo', () => {
    const state = createState(['abc']);

    expect(applyUndo(state)).toBe(state);
  });

  it('should clamp the restored cursor into the restored buffer', () => {
    const state: EditorState = {
      ...createState(['xxxxx']),
      cursor: { line: 0, col: 4 },
      undoStack: [{ buffer: ['ab'], cursor: { line: 0, col: 9 } }],
    };

    expect(applyUndo(state).cursor).toEqual({ line: 0, col: 1 });
  });
});

describe('applyRedo', () => {
  it('should restore the newest redo snapshot and move it back to the undo stack', () => {
    const state: EditorState = {
      ...withBuffer(createState(), ['original'], { line: 0, col: 0 }),
      redoStack: [{ buffer: ['edited'], cursor: { line: 0, col: 3 } }],
    };

    const redone = applyRedo(state);

    expect(redone.buffer).toEqual(['edited']);
    expect(redone.cursor).toEqual({ line: 0, col: 3 });
    expect(redone.redoStack).toEqual([]);
    expect(redone.undoStack).toEqual([{ buffer: ['original'], cursor: { line: 0, col: 0 } }]);
  });

  it('should be a no-op returning the same reference when there is nothing to redo', () => {
    const state = createState(['abc']);

    expect(applyRedo(state)).toBe(state);
  });
});
