import { describe, expect, it } from 'vitest';

import { dispatch } from '../dispatch';
import { createState } from '../state';
import type { Cursor, EditorState } from '../types';

function at(lines: string[], cursor: Cursor): EditorState {
  return { ...createState(lines), cursor };
}

function run(state: EditorState, keys: string[]): EditorState {
  return keys.reduce((s, key) => dispatch(s, key).state, state);
}

describe('u — undo', () => {
  it('should revert the last buffer-mutating command', () => {
    const state = run(at(['one', 'two'], { line: 0, col: 0 }), ['d', 'd', 'u']);

    expect(state.buffer).toEqual(['one', 'two']);
    expect(state.cursor).toEqual({ line: 0, col: 0 });
  });

  it('should walk back multiple changes one step at a time', () => {
    const edited = run(at(['a'], { line: 0, col: 0 }), ['x', 'A', 'b', 'c', 'Escape']);
    expect(edited.buffer).toEqual(['bc']);

    const undoneOnce = dispatch(edited, 'u').state;
    expect(undoneOnce.buffer).toEqual(['']);

    const undoneTwice = dispatch(undoneOnce, 'u').state;
    expect(undoneTwice.buffer).toEqual(['a']);
  });

  it('should collapse a whole insert session into one undo step', () => {
    const edited = run(at(['x'], { line: 0, col: 0 }), ['A', 'y', 'z', 'Escape']);
    expect(edited.buffer).toEqual(['xyz']);

    const undone = dispatch(edited, 'u').state;

    expect(undone.buffer).toEqual(['x']);
  });

  it('should be a no-op when there is nothing to undo', () => {
    const state = run(at(['abc'], { line: 0, col: 0 }), ['u']);

    expect(state.buffer).toEqual(['abc']);
    expect(state.history).toEqual([]);
  });
});

describe('Ctrl-r — redo', () => {
  it('should reapply an undone change', () => {
    const state = run(at(['one', 'two'], { line: 0, col: 0 }), ['d', 'd', 'u', 'Ctrl-r']);

    expect(state.buffer).toEqual(['two']);
  });

  it('should walk the stack forward and back in step', () => {
    const start = at(['a'], { line: 0, col: 0 });
    const twoEdits = run(start, ['x', 'i', 'z', 'Escape']);
    expect(twoEdits.buffer).toEqual(['z']);

    const back = run(twoEdits, ['u', 'u']);
    expect(back.buffer).toEqual(['a']);

    const forward = run(back, ['Ctrl-r', 'Ctrl-r']);
    expect(forward.buffer).toEqual(['z']);
  });

  it('should be discarded once a new change is made after an undo', () => {
    const state = run(at(['abcd'], { line: 0, col: 0 }), ['x', 'u', 'x', 'Ctrl-r']);

    expect(state.buffer).toEqual(['bcd']);
    expect(state.redoStack).toEqual([]);
  });

  it('should be a no-op when there is nothing to redo', () => {
    const state = run(at(['abc'], { line: 0, col: 0 }), ['Ctrl-r']);

    expect(state.buffer).toEqual(['abc']);
    expect(state.history).toEqual([]);
  });
});
