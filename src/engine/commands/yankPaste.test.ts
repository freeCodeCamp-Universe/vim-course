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

describe('yy — yank line', () => {
  it('should capture the current line linewise without changing the buffer', () => {
    const state = run(at(['one', 'two'], { line: 0, col: 1 }), ['y', 'y']);

    expect(state.register).toEqual({ text: 'one', linewise: true });
    expect(state.buffer).toEqual(['one', 'two']);
    expect(state.cursor).toEqual({ line: 0, col: 1 });
    expect(state.dirty).toBe(false);
  });

  it('should cancel on an invalid follow-up key with no register change', () => {
    const state = run(at(['one'], { line: 0, col: 0 }), ['y', 'j']);

    expect(state.register).toBeNull();
    expect(state.pendingOperator).toBeNull();
  });

  it('should record a yy action', () => {
    const state = run(at(['one'], { line: 0, col: 0 }), ['y', 'y']);

    expect(state.history).toEqual([{ type: 'edit', command: 'yy' }]);
  });
});

describe('yl — yank character', () => {
  it('should capture the character under the cursor charwise without changing the buffer', () => {
    const state = run(at(['one'], { line: 0, col: 1 }), ['y', 'l']);

    expect(state.register).toEqual({ text: 'n', linewise: false });
    expect(state.buffer).toEqual(['one']);
    expect(state.history).toEqual([{ type: 'edit', command: 'yl' }]);
  });

  it('should be a silent no-op on an empty line', () => {
    const state = run(at([''], { line: 0, col: 0 }), ['y', 'l']);

    expect(state.register).toBeNull();
    expect(state.history).toEqual([]);
  });

  it('should be a silent no-op when the cursor is past the last character', () => {
    const state = run(at(['one'], { line: 0, col: 3 }), ['y', 'l']);

    expect(state.register).toBeNull();
    expect(state.history).toEqual([]);
  });
});

describe('p — paste', () => {
  it('should duplicate a yanked line below the cursor', () => {
    const state = run(at(['one', 'two'], { line: 0, col: 0 }), ['y', 'y', 'p']);

    expect(state.buffer).toEqual(['one', 'one', 'two']);
    expect(state.cursor).toEqual({ line: 1, col: 0 });
    expect(state.dirty).toBe(true);
  });

  it('should place the cursor on the first non-blank of a pasted line', () => {
    const seeded: EditorState = {
      ...at(['target'], { line: 0, col: 0 }),
      register: { text: '  ab', linewise: true },
    };
    const state = run(seeded, ['p']);

    expect(state.buffer).toEqual(['target', '  ab']);
    expect(state.cursor).toEqual({ line: 1, col: 2 });
  });

  it('should paste multiple linewise yanked lines as separate buffer lines', () => {
    const seeded: EditorState = {
      ...at(['target', 'after'], { line: 0, col: 0 }),
      register: { text: 'one\ntwo\nthree', linewise: true },
    };
    const state = run(seeded, ['p']);

    expect(state.buffer).toEqual(['target', 'one', 'two', 'three', 'after']);
    expect(state.cursor).toEqual({ line: 1, col: 0 });
  });

  it('should paste charwise content after the cursor', () => {
    const state = run(at(['abc'], { line: 0, col: 1 }), ['x', 'p']);

    expect(state.buffer).toEqual(['acb']);
    expect(state.cursor).toEqual({ line: 0, col: 2 });
  });

  it('should paste charwise content at column 0 of an empty line', () => {
    const seeded: EditorState = {
      ...at([''], { line: 0, col: 0 }),
      register: { text: 'hi', linewise: false },
    };
    const state = run(seeded, ['p']);

    expect(state.buffer).toEqual(['hi']);
    expect(state.cursor).toEqual({ line: 0, col: 1 });
  });

  it('should split the line when charwise content spans lines', () => {
    const seeded: EditorState = {
      ...at(['abcd'], { line: 0, col: 0 }),
      register: { text: 'one\ntwo', linewise: false },
    };
    const state = run(seeded, ['p']);

    expect(state.buffer).toEqual(['aone', 'twobcd']);
    expect(state.cursor).toEqual({ line: 0, col: 1 });
  });

  it('should be a no-op with no register set', () => {
    const state = run(at(['abc'], { line: 0, col: 0 }), ['p']);

    expect(state.buffer).toEqual(['abc']);
    expect(state.dirty).toBe(false);
  });
});
