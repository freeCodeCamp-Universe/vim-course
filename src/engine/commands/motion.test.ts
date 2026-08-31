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

describe('normal-mode motions', () => {
  describe('h/j/k/l', () => {
    it('should move the cursor in each direction', () => {
      const start = at(['hello', 'world'], { line: 0, col: 1 });
      expect(run(start, ['l']).cursor).toEqual({ line: 0, col: 2 });
      expect(run(start, ['h']).cursor).toEqual({ line: 0, col: 0 });
      expect(run(start, ['j']).cursor).toEqual({ line: 1, col: 1 });
      expect(run(at(['hello', 'world'], { line: 1, col: 1 }), ['k']).cursor).toEqual({
        line: 0,
        col: 1,
      });
    });

    it('should clamp at buffer edges without wrapping', () => {
      expect(run(at(['ab'], { line: 0, col: 0 }), ['h']).cursor).toEqual({ line: 0, col: 0 });
      expect(run(at(['ab'], { line: 0, col: 1 }), ['l']).cursor).toEqual({ line: 0, col: 1 });
      expect(run(at(['a', 'b'], { line: 0, col: 0 }), ['k']).cursor).toEqual({ line: 0, col: 0 });
      expect(run(at(['a', 'b'], { line: 1, col: 0 }), ['j']).cursor).toEqual({ line: 1, col: 0 });
    });

    it('should move across astral Unicode characters one column at a time', () => {
      const start = at(['M𝒆𝒐𝒘'], { line: 0, col: 0 });

      expect(run(start, ['l', 'l']).cursor).toEqual({ line: 0, col: 2 });
      expect(run(start, ['l', 'l', 'l', 'l']).cursor).toEqual({ line: 0, col: 3 });
    });

    it('should clamp the column when moving onto a shorter line', () => {
      expect(run(at(['hello', 'hi'], { line: 0, col: 4 }), ['j']).cursor).toEqual({
        line: 1,
        col: 1,
      });
    });

    it('should restore the desired column after crossing a short line', () => {
      const start = at(['hello', '', 'world'], { line: 0, col: 4 });
      const result = run(start, ['j', 'j']);

      expect(result.cursor).toEqual({ line: 2, col: 4 });
    });

    it('should restore the desired column after crossing multiple short lines', () => {
      const start = at(['abcde', 'ab', '', 'ab', 'abcde'], { line: 0, col: 4 });
      const result = run(start, ['j', 'j', 'j', 'j']);

      expect(result.cursor).toEqual({ line: 4, col: 4 });
    });

    it('should clear the desired column after a horizontal motion', () => {
      const start = at(['hello', '', 'world'], { line: 0, col: 4 });
      // Move down (clamp to 0), right does nothing (empty line), then down again.
      // The `l` clears desiredCol, so the second `j` uses col 0, not 4.
      const result = run(start, ['j', 'l', 'j']);

      expect(result.cursor).toEqual({ line: 2, col: 0 });
    });

    it('should preserve the desired column through k as well as j', () => {
      const start = at(['world', '', 'hello'], { line: 2, col: 4 });
      const result = run(start, ['k', 'k']);

      expect(result.cursor).toEqual({ line: 0, col: 4 });
    });
  });

  describe('0 and $', () => {
    it('should jump to the first and last columns', () => {
      const start = at(['hello'], { line: 0, col: 2 });
      expect(run(start, ['$']).cursor).toEqual({ line: 0, col: 4 });
      expect(run(start, ['0']).cursor).toEqual({ line: 0, col: 0 });
    });

    it('should place $ at column 0 on an empty line', () => {
      expect(run(at(['', 'x'], { line: 0, col: 0 }), ['$']).cursor).toEqual({ line: 0, col: 0 });
    });
  });

  describe('%', () => {
    it('should jump between matching parentheses, brackets, and braces', () => {
      const buffer = ['(one [two] {three})'];

      expect(run(at(buffer, { line: 0, col: 0 }), ['%']).cursor).toEqual({ line: 0, col: 18 });
      expect(run(at(buffer, { line: 0, col: 5 }), ['%']).cursor).toEqual({ line: 0, col: 9 });
      expect(run(at(buffer, { line: 0, col: 11 }), ['%']).cursor).toEqual({ line: 0, col: 17 });
    });

    it('should match nested delimiters and work across lines', () => {
      const buffer = ['{', '  {nested}', '}'];

      expect(run(at(buffer, { line: 0, col: 0 }), ['%']).cursor).toEqual({ line: 2, col: 0 });
      expect(run(at(buffer, { line: 1, col: 2 }), ['%']).cursor).toEqual({ line: 1, col: 9 });
    });

    it('should leave the cursor in place when a delimiter has no match', () => {
      const start = at(['[unclosed'], { line: 0, col: 0 });
      const result = run(start, ['%']);

      expect(result.cursor).toEqual(start.cursor);
      expect(result.history).toEqual([{ type: 'motion', command: '%' }]);
    });

    it('should jump to the closing match when scanning forward finds an opening delimiter', () => {
      // Vim: from 'i' (col 0), % finds '(' at col 3 and leaps to its match ')' at col 7.
      const buffer = ['if (foo) {}'];
      expect(run(at(buffer, { line: 0, col: 0 }), ['%']).cursor).toEqual({ line: 0, col: 7 });
    });

    it('should return to the opening on a second %', () => {
      // First %: 'i' → ')' at col 7. Second %: ')' → '(' at col 3.
      const buffer = ['if (foo) {}'];
      expect(run(at(buffer, { line: 0, col: 0 }), ['%', '%']).cursor).toEqual({ line: 0, col: 3 });
    });

    it('should find ) and jump backward to ( when cursor is inside a bracket group', () => {
      // Cursor inside '(foo)' at 'o' (col 2); forward scan finds ')' at col 4,
      // matchDelimiterAt scans backward and lands on '(' at col 0.
      const buffer = ['(foo) {bar}'];
      expect(run(at(buffer, { line: 0, col: 2 }), ['%']).cursor).toEqual({ line: 0, col: 0 });
    });

    it('should leave the cursor in place when no opening delimiter exists ahead on the line', () => {
      const start = at(['no delimiters here'], { line: 0, col: 0 });
      expect(run(start, ['%']).cursor).toEqual(start.cursor);
    });

    it('should not scan forward when cursor is already on a delimiter', () => {
      // Cursor on '(' at col 0 — must jump to ')' at col 4, not skip to the '[' further right.
      const buffer = ['(foo) [bar]'];
      expect(run(at(buffer, { line: 0, col: 0 }), ['%']).cursor).toEqual({ line: 0, col: 4 });
    });
  });

  describe('gg and G', () => {
    it('should jump to the first and last lines', () => {
      const start = at(['one', 'two', 'three'], { line: 1, col: 2 });
      expect(run(start, ['G']).cursor).toEqual({ line: 2, col: 0 });
      expect(run(start, ['g', 'g']).cursor).toEqual({ line: 0, col: 0 });
    });

    it('should leave a pending prefix after a single g and cancel it on Escape', () => {
      const start = at(['one', 'two'], { line: 1, col: 1 });
      const pending = dispatch(start, 'g').state;
      expect(pending.pendingOperator).toBe('g');
      expect(pending.cursor).toEqual({ line: 1, col: 1 });

      const cancelled = dispatch(pending, 'Escape').state;
      expect(cancelled.pendingOperator).toBeNull();
    });

    it('should clear the pending prefix after gg resolves', () => {
      expect(run(at(['one', 'two'], { line: 1, col: 0 }), ['g', 'g']).pendingOperator).toBeNull();
    });
  });

  describe('w', () => {
    it('should move to the start of the next word', () => {
      expect(run(at(['foo bar'], { line: 0, col: 0 }), ['w']).cursor).toEqual({ line: 0, col: 4 });
    });

    it('should treat a punctuation run as its own word', () => {
      const start = at(['foo.bar'], { line: 0, col: 0 });
      expect(run(start, ['w']).cursor).toEqual({ line: 0, col: 3 });
      expect(run(start, ['w', 'w']).cursor).toEqual({ line: 0, col: 4 });
    });

    it('should cross line ends and stop on a blank line', () => {
      const buffer = ['ab', '', 'cd'];
      expect(run(at(buffer, { line: 0, col: 0 }), ['w']).cursor).toEqual({ line: 1, col: 0 });
      expect(run(at(buffer, { line: 1, col: 0 }), ['w']).cursor).toEqual({ line: 2, col: 0 });
    });

    it('should settle on the last character at the end of the buffer', () => {
      expect(run(at(['foo'], { line: 0, col: 0 }), ['w']).cursor).toEqual({ line: 0, col: 2 });
    });
  });

  describe('b', () => {
    it('should move to the start of the current or previous word', () => {
      expect(run(at(['foo bar'], { line: 0, col: 4 }), ['b']).cursor).toEqual({ line: 0, col: 0 });
      expect(run(at(['foo bar'], { line: 0, col: 6 }), ['b']).cursor).toEqual({ line: 0, col: 4 });
    });

    it('should treat a punctuation run as its own word', () => {
      expect(run(at(['foo.bar'], { line: 0, col: 4 }), ['b']).cursor).toEqual({ line: 0, col: 3 });
    });

    it('should cross line starts and stop on a blank line', () => {
      const buffer = ['ab', '', 'cd'];
      expect(run(at(buffer, { line: 2, col: 0 }), ['b']).cursor).toEqual({ line: 1, col: 0 });
      expect(run(at(buffer, { line: 1, col: 0 }), ['b']).cursor).toEqual({ line: 0, col: 0 });
    });

    it('should stay at the buffer start', () => {
      expect(run(at(['foo'], { line: 0, col: 0 }), ['b']).cursor).toEqual({ line: 0, col: 0 });
    });
  });

  describe('arrow keys', () => {
    it('should move the cursor like h/l/k/j', () => {
      const start = at(['hello', 'world'], { line: 0, col: 1 });
      expect(run(start, ['ArrowRight']).cursor).toEqual({ line: 0, col: 2 });
      expect(run(start, ['ArrowLeft']).cursor).toEqual({ line: 0, col: 0 });
      expect(run(start, ['ArrowDown']).cursor).toEqual({ line: 1, col: 1 });
      expect(run(at(['hello', 'world'], { line: 1, col: 1 }), ['ArrowUp']).cursor).toEqual({
        line: 0,
        col: 1,
      });
    });

    it('should clamp at buffer edges without wrapping', () => {
      expect(run(at(['ab'], { line: 0, col: 0 }), ['ArrowLeft']).cursor).toEqual({
        line: 0,
        col: 0,
      });
      expect(run(at(['ab'], { line: 0, col: 1 }), ['ArrowRight']).cursor).toEqual({
        line: 0,
        col: 1,
      });
    });

    it('should honor a pending count', () => {
      expect(run(at(['abcde'], { line: 0, col: 0 }), ['3', 'ArrowRight']).cursor).toEqual({
        line: 0,
        col: 3,
      });
    });

    it('should record their own command so they do not stand in for a taught motion', () => {
      const moved = run(at(['hello'], { line: 0, col: 0 }), ['ArrowRight']);
      expect(moved.history).toEqual([{ type: 'motion', command: 'ArrowRight' }]);
    });
  });

  it('should record a motion action for each move, including gg', () => {
    const moved = run(at(['one', 'two'], { line: 1, col: 0 }), ['k']);
    expect(moved.history).toEqual([{ type: 'motion', command: 'k' }]);

    const gg = run(at(['one', 'two'], { line: 1, col: 0 }), ['g', 'g']);
    expect(gg.history).toEqual([{ type: 'motion', command: 'gg' }]);
  });
});
