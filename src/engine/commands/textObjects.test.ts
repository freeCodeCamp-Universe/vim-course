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

describe('inner-word text object', () => {
  it('should delete inner word with diw', () => {
    const state = run(at(['one two three'], { line: 0, col: 5 }), ['d', 'i', 'w']);

    expect(state.buffer).toEqual(['one  three']);
    expect(state.cursor).toEqual({ line: 0, col: 4 });
    expect(state.mode).toBe('normal');
    expect(state.register).toEqual({ text: 'two', linewise: false });
    expect(state.history).toEqual([{ type: 'edit', command: 'diw' }]);
  });

  it('should change inner word with ciw and enter insert mode', () => {
    const state = run(at(['one two three'], { line: 0, col: 5 }), ['c', 'i', 'w']);

    expect(state.buffer).toEqual(['one  three']);
    expect(state.cursor).toEqual({ line: 0, col: 4 });
    expect(state.mode).toBe('insert');
    expect(state.register).toEqual({ text: 'two', linewise: false });
    expect(state.history).toEqual([{ type: 'edit', command: 'ciw' }]);
  });
});

describe('inner-quote text object', () => {
  it('should delete inside double quotes with di"', () => {
    const state = run(at(['say "hello world" now'], { line: 0, col: 8 }), ['d', 'i', '"']);

    expect(state.buffer).toEqual(['say "" now']);
    expect(state.cursor).toEqual({ line: 0, col: 5 });
    expect(state.mode).toBe('normal');
    expect(state.register).toEqual({ text: 'hello world', linewise: false });
    expect(state.history).toEqual([{ type: 'edit', command: 'di"' }]);
  });

  it('should change inside double quotes with ci" and enter insert mode', () => {
    const state = run(at(['say "hello" now'], { line: 0, col: 7 }), ['c', 'i', '"']);

    expect(state.buffer).toEqual(['say "" now']);
    expect(state.cursor).toEqual({ line: 0, col: 5 });
    expect(state.mode).toBe('insert');
    expect(state.register).toEqual({ text: 'hello', linewise: false });
    expect(state.history).toEqual([{ type: 'edit', command: 'ci"' }]);
  });

  it('should no-op when the cursor is not inside a quote pair', () => {
    const state = run(at(['say "hello" now'], { line: 0, col: 0 }), ['d', 'i', '"']);

    expect(state.buffer).toEqual(['say "hello" now']);
    expect(state.mode).toBe('normal');
    expect(state.history).toEqual([]);
    expect(state.dirty).toBe(false);
  });
});

describe('inner-paren text object', () => {
  it('should delete inside parentheses with di(', () => {
    const state = run(at(['sum(foo + bar) tail'], { line: 0, col: 8 }), ['d', 'i', '(']);

    expect(state.buffer).toEqual(['sum() tail']);
    expect(state.cursor).toEqual({ line: 0, col: 4 });
    expect(state.mode).toBe('normal');
    expect(state.register).toEqual({ text: 'foo + bar', linewise: false });
    expect(state.history).toEqual([{ type: 'edit', command: 'di(' }]);
  });

  it('should change inside nested parentheses with ci(', () => {
    const state = run(at(['call((alpha))'], { line: 0, col: 7 }), ['c', 'i', '(']);

    expect(state.buffer).toEqual(['call(())']);
    expect(state.cursor).toEqual({ line: 0, col: 6 });
    expect(state.mode).toBe('insert');
    expect(state.register).toEqual({ text: 'alpha', linewise: false });
    expect(state.history).toEqual([{ type: 'edit', command: 'ci(' }]);
  });

  it('should no-op when the cursor is not inside a parenthesis pair', () => {
    const state = run(at(['sum(foo) tail'], { line: 0, col: 0 }), ['c', 'i', '(']);

    expect(state.buffer).toEqual(['sum(foo) tail']);
    expect(state.mode).toBe('normal');
    expect(state.history).toEqual([]);
    expect(state.dirty).toBe(false);
  });
});
