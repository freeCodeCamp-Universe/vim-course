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

describe('counted motions', () => {
  it('should scale vertical motion with 5j and clamp at the buffer end', () => {
    const state = run(at(['a', 'b', 'c', 'd', 'e', 'f'], { line: 0, col: 0 }), ['5', 'j']);

    expect(state.cursor).toEqual({ line: 5, col: 0 });
    expect(state.pendingCount).toBe('');
  });

  it('should scale word motion with 3w', () => {
    const state = run(at(['one two three four'], { line: 0, col: 0 }), ['3', 'w']);

    expect(state.cursor).toEqual({ line: 0, col: 14 });
  });

  it('should keep 0 as start-of-line when no count is pending', () => {
    const state = run(at(['alpha beta'], { line: 0, col: 7 }), ['0']);

    expect(state.cursor).toEqual({ line: 0, col: 0 });
    expect(state.pendingCount).toBe('');
  });

  it('should jump to line n with {n}G and clamp past-end to the last line', () => {
    const third = run(at(['a', 'b', 'c', 'd'], { line: 0, col: 0 }), ['3', 'G']);
    expect(third.cursor).toEqual({ line: 2, col: 0 });

    const clamped = run(at(['a', 'b', 'c'], { line: 0, col: 0 }), ['9', 'G']);
    expect(clamped.cursor).toEqual({ line: 2, col: 0 });
  });
});

describe('counted operators', () => {
  it('should delete multiple lines with 3dd', () => {
    const state = run(at(['one', 'two', 'three', 'four', 'five'], { line: 1, col: 0 }), [
      '3',
      'd',
      'd',
    ]);

    expect(state.buffer).toEqual(['one', 'five']);
    expect(state.cursor).toEqual({ line: 1, col: 0 });
    expect(state.register).toEqual({ text: 'two\nthree\nfour', linewise: true });
  });

  it('should clamp 3dd at the end of the buffer', () => {
    const state = run(at(['one', 'two'], { line: 1, col: 0 }), ['3', 'd', 'd']);

    expect(state.buffer).toEqual(['one']);
    expect(state.cursor).toEqual({ line: 0, col: 0 });
    expect(state.register).toEqual({ text: 'two', linewise: true });
  });

  it('should delete multiple words with 2dw', () => {
    const state = run(at(['one two three'], { line: 0, col: 0 }), ['2', 'd', 'w']);

    expect(state.buffer).toEqual(['three']);
    expect(state.cursor).toEqual({ line: 0, col: 0 });
    expect(state.register).toEqual({ text: 'one two ', linewise: false });
  });

  it('should change multiple lines with 2cc and enter insert mode', () => {
    const state = run(at(['one', 'two', 'three', 'four'], { line: 1, col: 0 }), ['2', 'c', 'c']);

    expect(state.buffer).toEqual(['one', '', 'four']);
    expect(state.cursor).toEqual({ line: 1, col: 0 });
    expect(state.mode).toBe('insert');
    expect(state.register).toEqual({ text: 'two\nthree', linewise: true });
  });

  it('should change multiple words with 2cw and enter insert mode', () => {
    const state = run(at(['one two three'], { line: 0, col: 0 }), ['2', 'c', 'w']);

    expect(state.buffer).toEqual(['three']);
    expect(state.cursor).toEqual({ line: 0, col: 0 });
    expect(state.mode).toBe('insert');
    expect(state.register).toEqual({ text: 'one two ', linewise: false });
  });
});
