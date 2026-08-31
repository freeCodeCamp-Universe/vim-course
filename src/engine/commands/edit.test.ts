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

describe('x — delete char under cursor', () => {
  it('should delete the character and keep the cursor column', () => {
    const state = run(at(['abc'], { line: 0, col: 1 }), ['x']);

    expect(state.buffer).toEqual(['ac']);
    expect(state.cursor).toEqual({ line: 0, col: 1 });
    expect(state.mode).toBe('normal');
    expect(state.dirty).toBe(true);
  });

  it('should clamp the cursor left when deleting the last character on a line', () => {
    const state = run(at(['ab'], { line: 0, col: 1 }), ['x']);

    expect(state.buffer).toEqual(['a']);
    expect(state.cursor).toEqual({ line: 0, col: 0 });
  });

  it('should be a no-op on an empty line', () => {
    const state = run(at(['', 'x'], { line: 0, col: 0 }), ['x']);

    expect(state.buffer).toEqual(['', 'x']);
    expect(state.dirty).toBe(false);
  });

  it('should capture the deleted character charwise for paste', () => {
    const state = run(at(['abc'], { line: 0, col: 1 }), ['x']);

    expect(state.register).toEqual({ text: 'b', linewise: false });
  });
});

describe('r — replace char under cursor', () => {
  it('should replace the character and stay in normal mode', () => {
    const state = run(at(['cat'], { line: 0, col: 0 }), ['r', 'b']);

    expect(state.buffer).toEqual(['bat']);
    expect(state.cursor).toEqual({ line: 0, col: 0 });
    expect(state.mode).toBe('normal');
    expect(state.dirty).toBe(true);
  });

  it('should replace with an uppercase letter', () => {
    const state = run(at(['cat'], { line: 0, col: 0 }), ['r', 'H']);

    expect(state.buffer).toEqual(['Hat']);
    expect(state.cursor).toEqual({ line: 0, col: 0 });
    expect(state.mode).toBe('normal');
  });

  it('should replace with a digit rather than treating it as a count', () => {
    const state = run(at(['x'], { line: 0, col: 0 }), ['r', '5']);

    expect(state.buffer).toEqual(['5']);
    expect(state.pendingCount).toBe('');
  });

  it('should cancel on Escape, leaving the buffer unchanged', () => {
    const state = run(at(['cat'], { line: 0, col: 0 }), ['r', 'Escape']);

    expect(state.buffer).toEqual(['cat']);
    expect(state.pendingOperator).toBeNull();
    expect(state.dirty).toBe(false);
  });

  it('should not leave the register touched', () => {
    const state = run(at(['cat'], { line: 0, col: 0 }), ['r', 'b']);

    expect(state.register).toBeNull();
  });
});

describe('dd — delete line', () => {
  it('should delete the current line and move to the line now at that index', () => {
    const state = run(at(['one', 'two', 'three'], { line: 1, col: 1 }), ['d', 'd']);

    expect(state.buffer).toEqual(['one', 'three']);
    expect(state.cursor).toEqual({ line: 1, col: 0 });
    expect(state.mode).toBe('normal');
  });

  it('should clamp to the last line when deleting the last line', () => {
    const state = run(at(['one', 'two'], { line: 1, col: 0 }), ['d', 'd']);

    expect(state.buffer).toEqual(['one']);
    expect(state.cursor).toEqual({ line: 0, col: 0 });
  });

  it('should leave a single empty line when deleting the only line', () => {
    const state = run(at(['solo'], { line: 0, col: 0 }), ['d', 'd']);

    expect(state.buffer).toEqual(['']);
  });

  it('should capture the deleted line linewise', () => {
    const state = run(at(['one', 'two'], { line: 0, col: 0 }), ['d', 'd']);

    expect(state.register).toEqual({ text: 'one', linewise: true });
  });
});

describe('dw — delete word', () => {
  it('should delete the word and its trailing whitespace', () => {
    const state = run(at(['foo bar'], { line: 0, col: 0 }), ['d', 'w']);

    expect(state.buffer).toEqual(['bar']);
    expect(state.cursor).toEqual({ line: 0, col: 0 });
    expect(state.mode).toBe('normal');
    expect(state.register).toEqual({ text: 'foo ', linewise: false });
  });

  it('should delete only the punctuation run when the cursor sits on one', () => {
    const state = run(at(['foo.bar'], { line: 0, col: 3 }), ['d', 'w']);

    expect(state.buffer).toEqual(['foobar']);
  });

  it('should delete to end of line for the last word on the line', () => {
    const state = run(at(['foo'], { line: 0, col: 0 }), ['d', 'w']);

    expect(state.buffer).toEqual(['']);
  });
});

describe('D — delete to end of line', () => {
  it('should delete from the cursor to the end of the line', () => {
    const state = run(at(['hello world'], { line: 0, col: 5 }), ['D']);

    expect(state.buffer).toEqual(['hello']);
    expect(state.cursor).toEqual({ line: 0, col: 4 });
    expect(state.register).toEqual({ text: ' world', linewise: false });
  });

  it('should be a no-op when the cursor is past the end of an empty line', () => {
    const state = run(at([''], { line: 0, col: 0 }), ['D']);

    expect(state.buffer).toEqual(['']);
    expect(state.dirty).toBe(false);
  });
});

describe('cw — change word', () => {
  it('should delete the word without trailing whitespace and enter insert mode', () => {
    const state = run(at(['foo bar'], { line: 0, col: 0 }), ['c', 'w']);

    expect(state.buffer).toEqual([' bar']);
    expect(state.cursor).toEqual({ line: 0, col: 0 });
    expect(state.mode).toBe('insert');
    expect(state.register).toEqual({ text: 'foo', linewise: false });
  });

  it('should let typed text land in the cleared word position', () => {
    const state = run(at(['foo bar'], { line: 0, col: 0 }), ['c', 'w', 'b', 'a', 'z']);

    expect(state.buffer).toEqual(['baz bar']);
  });
});

describe('cc — change line', () => {
  it('should clear the line, keep it, and enter insert mode', () => {
    const state = run(at(['one', 'two'], { line: 0, col: 2 }), ['c', 'c']);

    expect(state.buffer).toEqual(['', 'two']);
    expect(state.cursor).toEqual({ line: 0, col: 0 });
    expect(state.mode).toBe('insert');
    expect(state.register).toEqual({ text: 'one', linewise: true });
  });

  it('should let typed text replace the cleared line', () => {
    const state = run(at(['one'], { line: 0, col: 0 }), ['c', 'c', 'n', 'e', 'w']);

    expect(state.buffer).toEqual(['new']);
  });
});

describe('operator pending state', () => {
  it('should set a pending operator after d and clear it once resolved', () => {
    const pending = dispatch(at(['one', 'two'], { line: 0, col: 0 }), 'd').state;
    expect(pending.pendingOperator).toBe('d');

    const done = dispatch(pending, 'd').state;
    expect(done.pendingOperator).toBeNull();
  });

  it('should cancel the operator on an invalid follow-up key', () => {
    const state = run(at(['one', 'two'], { line: 0, col: 0 }), ['d', 'j']);

    expect(state.buffer).toEqual(['one', 'two']);
    expect(state.pendingOperator).toBeNull();
    expect(state.dirty).toBe(false);
  });

  it('should report the whole attempted sequence as unsupported', () => {
    expect(run(at(['one', 'two'], { line: 0, col: 0 }), ['d', '$']).status).toBe(
      'd$ is not supported in this lesson'
    );
    expect(run(at(['one two'], { line: 0, col: 0 }), ['y', 'w']).status).toBe(
      'yw is not supported in this lesson'
    );
    expect(run(at(['[one]'], { line: 0, col: 1 }), ['d', 'i', ']']).status).toBe(
      'di] is not supported in this lesson'
    );
  });

  it('should stay silent when a supported text object finds no range', () => {
    const state = run(at(['  one'], { line: 0, col: 0 }), ['d', 'i', 'w']);

    expect(state.status).toBe('');
    expect(state.buffer).toEqual(['  one']);
  });

  it('should cancel a pending operator on Escape', () => {
    const state = run(at(['abc'], { line: 0, col: 0 }), ['d', 'Escape']);

    expect(state.pendingOperator).toBeNull();
    expect(state.buffer).toEqual(['abc']);
  });
});

describe('d% — delete to matching delimiter', () => {
  it('should delete from an opening delimiter to its closing match', () => {
    const state = run(at(['(hello)'], { line: 0, col: 0 }), ['d', '%']);

    expect(state.buffer).toEqual(['']);
    expect(state.cursor).toEqual({ line: 0, col: 0 });
    expect(state.register).toEqual({ text: '(hello)', linewise: false });
    expect(state.dirty).toBe(true);
  });

  it('should delete from a closing delimiter back to its opening match', () => {
    const state = run(at(['(hello)'], { line: 0, col: 6 }), ['d', '%']);

    expect(state.buffer).toEqual(['']);
    expect(state.cursor).toEqual({ line: 0, col: 0 });
    expect(state.register).toEqual({ text: '(hello)', linewise: false });
  });

  it('should preserve surrounding text outside the deleted range', () => {
    const state = run(at(['a(bc)d'], { line: 0, col: 1 }), ['d', '%']);

    expect(state.buffer).toEqual(['ad']);
    expect(state.cursor).toEqual({ line: 0, col: 1 });
  });

  it('should delete across lines when the match is on a different line', () => {
    const state = run(at(['(hello', 'world)'], { line: 0, col: 0 }), ['d', '%']);

    expect(state.buffer).toEqual(['']);
    expect(state.cursor).toEqual({ line: 0, col: 0 });
    expect(state.register).toEqual({ text: '(hello\nworld)', linewise: false });
  });

  it('should be a no-op when there is no matching delimiter', () => {
    const state = run(at(['[unclosed'], { line: 0, col: 0 }), ['d', '%']);

    expect(state.buffer).toEqual(['[unclosed']);
    expect(state.dirty).toBe(false);
  });

  it('should be a no-op when cursor is not near any delimiter', () => {
    const state = run(at(['no delimiters'], { line: 0, col: 0 }), ['d', '%']);

    expect(state.buffer).toEqual(['no delimiters']);
    expect(state.dirty).toBe(false);
  });

  it('should record a d% action in history', () => {
    const state = run(at(['(hi)'], { line: 0, col: 0 }), ['d', '%']);

    expect(state.history).toEqual([{ type: 'edit', command: 'd%' }]);
  });
});

describe('c% — change to matching delimiter', () => {
  it('should delete from an opening delimiter to its match and enter insert mode', () => {
    const state = run(at(['(hello)'], { line: 0, col: 0 }), ['c', '%']);

    expect(state.buffer).toEqual(['']);
    expect(state.cursor).toEqual({ line: 0, col: 0 });
    expect(state.mode).toBe('insert');
    expect(state.register).toEqual({ text: '(hello)', linewise: false });
    expect(state.dirty).toBe(true);
  });

  it('should delete from a closing delimiter back to its opening match and enter insert mode', () => {
    const state = run(at(['(hello)'], { line: 0, col: 6 }), ['c', '%']);

    expect(state.buffer).toEqual(['']);
    expect(state.cursor).toEqual({ line: 0, col: 0 });
    expect(state.mode).toBe('insert');
  });

  it('should preserve surrounding text outside the changed range', () => {
    const state = run(at(['a(bc)d'], { line: 0, col: 1 }), ['c', '%']);

    expect(state.buffer).toEqual(['ad']);
    expect(state.cursor).toEqual({ line: 0, col: 1 });
    expect(state.mode).toBe('insert');
  });

  it('should change across lines', () => {
    const state = run(at(['(hello', 'world)'], { line: 0, col: 0 }), ['c', '%']);

    expect(state.buffer).toEqual(['']);
    expect(state.mode).toBe('insert');
    expect(state.register).toEqual({ text: '(hello\nworld)', linewise: false });
  });

  it('should be a no-op when there is no matching delimiter', () => {
    const state = run(at(['[unclosed'], { line: 0, col: 0 }), ['c', '%']);

    expect(state.buffer).toEqual(['[unclosed']);
    expect(state.mode).toBe('normal');
    expect(state.dirty).toBe(false);
  });

  it('should record a c% action in history', () => {
    const state = run(at(['(hi)'], { line: 0, col: 0 }), ['c', '%']);

    expect(state.history).toEqual([{ type: 'edit', command: 'c%' }]);
  });
});

describe('action history', () => {
  it('should record an edit action for each completed command', () => {
    expect(run(at(['abc'], { line: 0, col: 0 }), ['x']).history).toEqual([
      { type: 'edit', command: 'x' },
    ]);
    expect(run(at(['one', 'two'], { line: 0, col: 0 }), ['d', 'd']).history).toEqual([
      { type: 'edit', command: 'dd' },
    ]);
    expect(run(at(['foo bar'], { line: 0, col: 0 }), ['d', 'w']).history).toEqual([
      { type: 'edit', command: 'dw' },
    ]);
    expect(run(at(['foo bar'], { line: 0, col: 0 }), ['c', 'w']).history).toEqual([
      { type: 'edit', command: 'cw' },
    ]);
  });
});
