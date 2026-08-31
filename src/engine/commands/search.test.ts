import { describe, expect, it } from 'vitest';

import { dispatch } from '../dispatch';
import { createState } from '../state';
import type { Cursor, EditorState } from '../types';
import { buildRegex, findMatches, parseCaseFlag } from './search';

function at(lines: string[], cursor: Cursor): EditorState {
  return { ...createState(lines), cursor };
}

function run(state: EditorState, keys: string[]): EditorState {
  return keys.reduce((s, key) => dispatch(s, key).state, state);
}

describe('buildRegex', () => {
  it('should build a valid regex from a normal pattern', () => {
    const regex = buildRegex('hello', 'g');
    expect(regex).toBeInstanceOf(RegExp);
    expect('hello world'.match(regex!)).toEqual(['hello']);
  });

  it('should return null for an irrecoverably invalid pattern', () => {
    expect(buildRegex('[', 'g')).toBeNull();
  });

  it('should treat a bare * at the start as a literal asterisk', () => {
    const regex = buildRegex('*', 'g');
    expect(regex).toBeInstanceOf(RegExp);
    expect('a * b'.match(regex!)).toEqual(['*']);
  });

  it('should treat a bare + at the start as a literal plus sign', () => {
    const regex = buildRegex('+', 'g');
    expect(regex).toBeInstanceOf(RegExp);
    expect('a + b'.match(regex!)).toEqual(['+']);
  });

  it('should treat a bare ? at the start as a literal question mark', () => {
    const regex = buildRegex('?', 'g');
    expect(regex).toBeInstanceOf(RegExp);
    expect('what?'.match(regex!)).toEqual(['?']);
  });

  it('should preserve * as a quantifier when it has a preceding atom', () => {
    const regex = buildRegex('a*', 'g');
    expect(regex).toBeInstanceOf(RegExp);
    expect('aaa'.match(regex!)).not.toBeNull();
  });
});

describe('parseCaseFlag', () => {
  it('should return ignoreCase false when no flag is present', () => {
    const result = parseCaseFlag('hello');
    expect(result).toEqual({ cleaned: 'hello', ignoreCase: false });
  });

  it('should strip \\c and set ignoreCase true', () => {
    const result = parseCaseFlag('hello\\c');
    expect(result).toEqual({ cleaned: 'hello', ignoreCase: true });
  });

  it('should strip \\C and set ignoreCase false', () => {
    const result = parseCaseFlag('hello\\C');
    expect(result).toEqual({ cleaned: 'hello', ignoreCase: false });
  });

  it('should handle \\c at the start of the pattern', () => {
    const result = parseCaseFlag('\\chello');
    expect(result).toEqual({ cleaned: 'hello', ignoreCase: true });
  });

  it('should handle \\c in the middle of the pattern', () => {
    const result = parseCaseFlag('he\\cllo');
    expect(result).toEqual({ cleaned: 'hello', ignoreCase: true });
  });

  it('should let the last flag win when both \\c and \\C appear', () => {
    const result = parseCaseFlag('\\chello\\C');
    expect(result).toEqual({ cleaned: 'hello', ignoreCase: false });
  });

  it('should let \\c win when it appears after \\C', () => {
    const result = parseCaseFlag('\\Chello\\c');
    expect(result).toEqual({ cleaned: 'hello', ignoreCase: true });
  });

  it('should strip multiple flags and let the last one win', () => {
    const result = parseCaseFlag('\\ca\\Cb\\c');
    expect(result).toEqual({ cleaned: 'ab', ignoreCase: true });
  });

  it('should return an empty cleaned pattern when only \\c is given', () => {
    const result = parseCaseFlag('\\c');
    expect(result).toEqual({ cleaned: '', ignoreCase: true });
  });
});

describe('findMatches with \\c flag', () => {
  const buffer = ['Hello World', 'hello world', 'HELLO WORLD'];

  it('should match case-sensitively by default', () => {
    const matches = findMatches(buffer, 'Hello');
    expect(matches).toEqual([{ line: 0, col: 0 }]);
  });

  it('should match case-insensitively with \\c', () => {
    const matches = findMatches(buffer, 'Hello\\c');
    expect(matches).toEqual([
      { line: 0, col: 0 },
      { line: 1, col: 0 },
      { line: 2, col: 0 },
    ]);
  });

  it('should match case-insensitively with \\c at the start', () => {
    const matches = findMatches(buffer, '\\cHello');
    expect(matches).toEqual([
      { line: 0, col: 0 },
      { line: 1, col: 0 },
      { line: 2, col: 0 },
    ]);
  });

  it('should force case-sensitive matching with \\C', () => {
    const matches = findMatches(buffer, 'hello\\C');
    expect(matches).toEqual([{ line: 1, col: 0 }]);
  });

  it('should handle \\c with regex patterns', () => {
    const matches = findMatches(buffer, 'h.llo\\c');
    expect(matches).toEqual([
      { line: 0, col: 0 },
      { line: 1, col: 0 },
      { line: 2, col: 0 },
    ]);
  });

  it('should return empty for invalid regex even with \\c', () => {
    const matches = findMatches(buffer, '[\\c');
    expect(matches).toEqual([]);
  });
});

describe('findMatches with bare quantifiers', () => {
  it('should find literal * characters when pattern is bare *', () => {
    const buffer = ['a * b', 'no asterisk here'];
    const matches = findMatches(buffer, '*');
    expect(matches).toEqual([{ line: 0, col: 2 }]);
  });

  it('should find all literal * characters across lines', () => {
    const buffer = ['* first', 'mid * dle', '** two'];
    const matches = findMatches(buffer, '*');
    expect(matches).toEqual([
      { line: 0, col: 0 },
      { line: 1, col: 4 },
      { line: 2, col: 0 },
      { line: 2, col: 1 },
    ]);
  });

  it('should find literal + characters when pattern is bare +', () => {
    const buffer = ['a + b'];
    const matches = findMatches(buffer, '+');
    expect(matches).toEqual([{ line: 0, col: 2 }]);
  });
});

describe('search with \\c via dispatch', () => {
  it('should find case-insensitive match when \\c is in the search pattern', () => {
    const state = at(['Hello World', 'hello world'], { line: 0, col: 0 });
    const afterSearch = run(state, ['/', ...'hello\\c'.split(''), 'Enter']);

    // "hello\c" matches case-insensitively; cursor at 0,0 so first "after"
    // match is line 1 col 0
    expect(afterSearch.cursor).toEqual({ line: 1, col: 0 });
  });

  it('should repeat case-insensitive search with n after \\c search', () => {
    const state = at(['Hello World', 'hello world', 'HELLO WORLD'], { line: 0, col: 0 });
    const afterSearch = run(state, ['/', ...'hello\\c'.split(''), 'Enter']);
    const afterN = run(afterSearch, ['n']);
    expect(afterN.cursor).toEqual({ line: 2, col: 0 });
  });

  it('should record the complete search command in history', () => {
    const state = at(['Kleene'], { line: 0, col: 0 });
    const afterSearch = run(state, ['/', ...'Kleene'.split(''), 'Enter']);

    expect(afterSearch.history.at(-1)).toEqual({ type: 'search', command: '/Kleene' });
  });

  it('should find a literal * when searching with bare *', () => {
    const state = at(['hello * world'], { line: 0, col: 0 });
    const afterSearch = run(state, ['/', '*', 'Enter']);
    expect(afterSearch.cursor).toEqual({ line: 0, col: 6 });
  });
});
