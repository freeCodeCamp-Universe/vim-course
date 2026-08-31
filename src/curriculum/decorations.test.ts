import { describe, expect, it } from 'vitest';

import { extractDecorations } from './decorations';

describe('extractDecorations', () => {
  it('should extract a basic marker', () => {
    expect(extractDecorations('hello ${world} foo')).toEqual({
      text: 'hello world foo',
      ranges: [{ line: 0, startCol: 6, endCol: 11 }],
    });
  });

  it('should extract multiple markers on one line', () => {
    expect(extractDecorations('${a} and ${b}')).toEqual({
      text: 'a and b',
      ranges: [
        { line: 0, startCol: 0, endCol: 1 },
        { line: 0, startCol: 6, endCol: 7 },
      ],
    });
  });

  it('should preserve escaped markers without decorating them', () => {
    expect(extractDecorations('use \\${var} here')).toEqual({
      text: 'use ${var} here',
      ranges: [],
    });
  });

  it('should preserve an unclosed marker literally', () => {
    expect(extractDecorations('cost is ${expensive\nstuff')).toEqual({
      text: 'cost is ${expensive\nstuff',
      ranges: [],
    });
  });

  it('should strip empty markers without recording a range', () => {
    expect(extractDecorations('${}rest')).toEqual({ text: 'rest', ranges: [] });
  });

  it('should extract adjacent markers', () => {
    expect(extractDecorations('${a}${b}')).toEqual({
      text: 'ab',
      ranges: [
        { line: 0, startCol: 0, endCol: 1 },
        { line: 0, startCol: 1, endCol: 2 },
      ],
    });
  });

  it('should track marker lines and allow spaces in marker content', () => {
    expect(extractDecorations('first\nsecond ${hello world}')).toEqual({
      text: 'first\nsecond hello world',
      ranges: [{ line: 1, startCol: 7, endCol: 18 }],
    });
  });
});
