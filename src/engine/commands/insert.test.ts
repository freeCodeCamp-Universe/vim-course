import { describe, expect, it } from 'vitest';

import { dispatch } from '../dispatch';
import { createState } from '../state';
import type { EditorState } from '../types';

/** Drive a sequence of keystrokes through the real registry and return the final state. */
function run(lines: string[], cursor: { line: number; col: number }, keys: string[]): EditorState {
  let state: EditorState = { ...createState(lines), cursor };
  for (const key of keys) {
    state = dispatch(state, key).state;
  }
  return state;
}

describe('insert-family entry commands', () => {
  it('should enter insert at the cursor with `i`, leaving the column put', () => {
    const state = run(['hello'], { line: 0, col: 2 }, ['i']);

    expect(state.mode).toBe('insert');
    expect(state.cursor).toEqual({ line: 0, col: 2 });
  });

  it('should enter insert after the cursor with `a`', () => {
    const state = run(['hello'], { line: 0, col: 2 }, ['a']);

    expect(state.mode).toBe('insert');
    expect(state.cursor).toEqual({ line: 0, col: 3 });
  });

  it('should place the cursor one past the last character with `a` at end of line', () => {
    const state = run(['hi'], { line: 0, col: 1 }, ['a']);

    expect(state.cursor).toEqual({ line: 0, col: 2 });
  });

  it('should enter insert at end of line with `A`', () => {
    const state = run(['hello'], { line: 0, col: 0 }, ['A']);

    expect(state.mode).toBe('insert');
    expect(state.cursor).toEqual({ line: 0, col: 5 });
  });

  it('should open a line below with `o` and position the cursor for typing', () => {
    const state = run(['one', 'two'], { line: 0, col: 1 }, ['o']);

    expect(state.mode).toBe('insert');
    expect(state.buffer).toEqual(['one', '', 'two']);
    expect(state.cursor).toEqual({ line: 1, col: 0 });
    expect(state.dirty).toBe(true);
  });

  it('should open a line above with `O` and position the cursor for typing', () => {
    const state = run(['one', 'two'], { line: 1, col: 1 }, ['O']);

    expect(state.mode).toBe('insert');
    expect(state.buffer).toEqual(['one', '', 'two']);
    expect(state.cursor).toEqual({ line: 1, col: 0 });
    expect(state.dirty).toBe(true);
  });

  it('should not set the dirty flag on `i`/`a`/`A` before any text is typed', () => {
    expect(run(['hello'], { line: 0, col: 0 }, ['i']).dirty).toBe(false);
    expect(run(['hello'], { line: 0, col: 0 }, ['a']).dirty).toBe(false);
    expect(run(['hello'], { line: 0, col: 0 }, ['A']).dirty).toBe(false);
  });

  it('should record the mode change in action history', () => {
    const state = run(['hi'], { line: 0, col: 0 }, ['i']);

    expect(state.history).toEqual([{ type: 'mode', command: 'i' }]);
  });
});

describe('Esc leaving insert mode', () => {
  it('should return to normal and step the cursor left one column', () => {
    const state = run(['hello'], { line: 0, col: 3 }, ['i', 'Escape']);

    expect(state.mode).toBe('normal');
    expect(state.cursor).toEqual({ line: 0, col: 2 });
  });

  it('should not step past column 0', () => {
    const state = run(['hello'], { line: 0, col: 0 }, ['i', 'Escape']);

    expect(state.cursor).toEqual({ line: 0, col: 0 });
  });

  it('should record the mode change back to normal', () => {
    const state = run(['hi'], { line: 0, col: 0 }, ['i', 'Escape']);

    expect(state.history).toContainEqual({ type: 'mode', command: 'Escape' });
  });
});

describe('typing in insert mode', () => {
  it('should insert printable characters at the cursor and advance it', () => {
    const state = run(['ac'], { line: 0, col: 1 }, ['i', 'b']);

    expect(state.buffer).toEqual(['abc']);
    expect(state.cursor).toEqual({ line: 0, col: 2 });
    expect(state.dirty).toBe(true);
  });

  it('should type digits literally rather than treating them as counts', () => {
    const state = run([''], { line: 0, col: 0 }, ['i', '4', '2']);

    expect(state.buffer).toEqual(['42']);
    expect(state.pendingCount).toBe('');
  });

  it('should append a full word typed after `A`', () => {
    const state = run(['foo'], { line: 0, col: 0 }, ['A', 'b', 'a', 'r']);

    expect(state.buffer).toEqual(['foobar']);
    expect(state.cursor).toEqual({ line: 0, col: 6 });
  });

  it('should ignore non-printable keys such as Tab', () => {
    const state = run(['hi'], { line: 0, col: 0 }, ['i', 'Tab']);

    expect(state.buffer).toEqual(['hi']);
    expect(state.cursor).toEqual({ line: 0, col: 0 });
  });
});

describe('arrow keys in insert mode', () => {
  it('should move the cursor without typing a character', () => {
    const state = run(['hello'], { line: 0, col: 2 }, ['i', 'ArrowRight']);

    expect(state.mode).toBe('insert');
    expect(state.buffer).toEqual(['hello']);
    expect(state.cursor).toEqual({ line: 0, col: 3 });
  });

  it('should allow the cursor to rest one past the last character', () => {
    const state = run(['hi'], { line: 0, col: 1 }, ['i', 'ArrowRight', 'ArrowRight']);

    expect(state.cursor).toEqual({ line: 0, col: 2 });
  });

  it('should move between lines', () => {
    const state = run(['one', 'two'], { line: 0, col: 1 }, ['i', 'ArrowDown']);

    expect(state.cursor).toEqual({ line: 1, col: 1 });
  });
});

describe('Enter in insert mode', () => {
  it('should split the line at the cursor and move to the new line start', () => {
    const state = run(['hello'], { line: 0, col: 2 }, ['i', 'Enter']);

    expect(state.buffer).toEqual(['he', 'llo']);
    expect(state.cursor).toEqual({ line: 1, col: 0 });
    expect(state.dirty).toBe(true);
  });
});

describe('Backspace in insert mode', () => {
  it('should delete the character before the cursor', () => {
    const state = run(['abc'], { line: 0, col: 2 }, ['i', 'Backspace']);

    expect(state.buffer).toEqual(['ac']);
    expect(state.cursor).toEqual({ line: 0, col: 1 });
    expect(state.dirty).toBe(true);
  });

  it('should join with the previous line when at column 0', () => {
    const state = run(['one', 'two'], { line: 1, col: 0 }, ['i', 'Backspace']);

    expect(state.buffer).toEqual(['onetwo']);
    expect(state.cursor).toEqual({ line: 0, col: 3 });
  });

  it('should be a no-op at the very start of the buffer', () => {
    const state = run(['abc'], { line: 0, col: 0 }, ['i', 'Backspace']);

    expect(state.buffer).toEqual(['abc']);
    expect(state.cursor).toEqual({ line: 0, col: 0 });
  });
});

describe('Delete in insert mode', () => {
  it('should delete the character at the cursor', () => {
    const state = run(['abc'], { line: 0, col: 1 }, ['i', 'Delete']);

    expect(state.buffer).toEqual(['ac']);
    expect(state.cursor).toEqual({ line: 0, col: 1 });
    expect(state.dirty).toBe(true);
  });

  it('should join with the next line when at the end of the current line', () => {
    const state = run(['one', 'two'], { line: 0, col: 3 }, ['i', 'Delete']);

    expect(state.buffer).toEqual(['onetwo']);
    expect(state.cursor).toEqual({ line: 0, col: 3 });
  });

  it('should be a no-op at the very end of the buffer', () => {
    const state = run(['abc'], { line: 0, col: 3 }, ['i', 'Delete']);

    expect(state.buffer).toEqual(['abc']);
    expect(state.cursor).toEqual({ line: 0, col: 3 });
  });
});
