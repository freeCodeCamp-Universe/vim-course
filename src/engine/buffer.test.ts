import { describe, expect, it } from 'vitest';

import {
  clampCol,
  clampCursor,
  clampLine,
  deleteChar,
  deleteLine,
  getLine,
  insertChar,
  insertLine,
  insertText,
  joinLines,
  lineCount,
  normalizeBuffer,
  splitLine,
} from './buffer';

describe('normalizeBuffer', () => {
  it('should keep a single empty line for an empty input', () => {
    expect(normalizeBuffer([])).toEqual(['']);
  });

  it('should copy the input rather than share the reference', () => {
    const input = ['a', 'b'];
    const result = normalizeBuffer(input);

    expect(result).toEqual(['a', 'b']);
    expect(result).not.toBe(input);
  });
});

describe('lineCount', () => {
  it('should count the lines in the buffer', () => {
    expect(lineCount(['a', 'b', 'c'])).toBe(3);
  });
});

describe('clampLine', () => {
  it('should clamp a line index within buffer bounds', () => {
    const buffer = ['a', 'b', 'c'];

    expect(clampLine(buffer, -5)).toBe(0);
    expect(clampLine(buffer, 1)).toBe(1);
    expect(clampLine(buffer, 99)).toBe(2);
  });
});

describe('clampCol', () => {
  it('should clamp to the last character in normal mode', () => {
    expect(clampCol(['hello'], 0, 99)).toBe(4);
  });

  it('should allow one past the last character when allowEnd is set', () => {
    expect(clampCol(['hello'], 0, 99, true)).toBe(5);
  });

  it('should stay at column 0 on an empty line', () => {
    expect(clampCol([''], 0, 3)).toBe(0);
    expect(clampCol([''], 0, 3, true)).toBe(0);
  });

  it('should count astral Unicode characters as one column', () => {
    expect(clampCol(['M𝒆𝒐𝒘'], 0, 99)).toBe(3);
    expect(clampCol(['M𝒆𝒐𝒘'], 0, 99, true)).toBe(4);
  });
});

describe('clampCursor', () => {
  it('should clamp both line and column at buffer edges', () => {
    const buffer = ['hello', 'hi'];

    expect(clampCursor(buffer, { line: 99, col: 99 })).toEqual({ line: 1, col: 1 });
    expect(clampCursor(buffer, { line: -1, col: -1 })).toEqual({ line: 0, col: 0 });
  });
});

describe('getLine', () => {
  it('should return the text of an in-bounds line', () => {
    expect(getLine(['a', 'b'], 1)).toBe('b');
  });

  it('should clamp out-of-bounds requests to an existing line', () => {
    expect(getLine(['a', 'b'], 99)).toBe('b');
  });
});

describe('insertChar', () => {
  it('should insert a character at the cursor column', () => {
    expect(insertChar(['ac'], 0, 1, 'b')).toEqual(['abc']);
  });

  it('should append when the column is past the end of the line', () => {
    expect(insertChar(['ab'], 0, 99, 'c')).toEqual(['abc']);
  });

  it('should insert into an empty line', () => {
    expect(insertChar([''], 0, 0, 'x')).toEqual(['x']);
  });

  it('should not mutate the original buffer', () => {
    const buffer = ['ac'];
    insertChar(buffer, 0, 1, 'b');

    expect(buffer).toEqual(['ac']);
  });

  it('should insert beside an astral Unicode character', () => {
    expect(insertChar(['M𝒆𝒘'], 0, 2, 'o')).toEqual(['M𝒆o𝒘']);
  });
});

describe('deleteChar', () => {
  it('should delete the character at the column', () => {
    expect(deleteChar(['abc'], 0, 1)).toEqual(['ac']);
  });

  it('should clamp to the last character when the column is past the end', () => {
    expect(deleteChar(['abc'], 0, 99)).toEqual(['ab']);
  });

  it('should leave an empty line unchanged', () => {
    expect(deleteChar([''], 0, 0)).toEqual(['']);
  });
});

describe('splitLine', () => {
  it('should split a line at the column', () => {
    expect(splitLine(['abcd'], 0, 2)).toEqual(['ab', 'cd']);
  });

  it('should split at the start into an empty leading line', () => {
    expect(splitLine(['abc'], 0, 0)).toEqual(['', 'abc']);
  });

  it('should split at the end into an empty trailing line', () => {
    expect(splitLine(['abc'], 0, 3)).toEqual(['abc', '']);
  });
});

describe('joinLines', () => {
  it('should join a line with the one below it', () => {
    expect(joinLines(['ab', 'cd', 'ef'], 0)).toEqual(['abcd', 'ef']);
  });

  it('should be a no-op on the last line', () => {
    expect(joinLines(['ab', 'cd'], 1)).toEqual(['ab', 'cd']);
  });
});

describe('insertLine', () => {
  it('should insert a line at the given index', () => {
    expect(insertLine(['a', 'c'], 1, 'b')).toEqual(['a', 'b', 'c']);
  });

  it('should default to an empty line and clamp past-end indices', () => {
    expect(insertLine(['a'], 99)).toEqual(['a', '']);
  });
});

describe('deleteLine', () => {
  it('should delete the line at the index', () => {
    expect(deleteLine(['a', 'b', 'c'], 1)).toEqual(['a', 'c']);
  });

  it('should leave a single empty line when deleting the only line', () => {
    expect(deleteLine(['only'], 0)).toEqual(['']);
  });

  it('should clamp a past-end index to the last line', () => {
    expect(deleteLine(['a', 'b'], 99)).toEqual(['a']);
  });
});

describe('insertText', () => {
  it('should insert a single-line string at the cursor', () => {
    const result = insertText(['hello world'], 0, 5, ' beautiful');
    expect(result.buffer).toEqual(['hello beautiful world']);
    expect(result.cursor).toEqual({ line: 0, col: 15 });
  });

  it('should insert multi-line text and split the line', () => {
    const result = insertText(['abcd'], 0, 2, 'X\nY\nZ');
    expect(result.buffer).toEqual(['abX', 'Y', 'Zcd']);
    expect(result.cursor).toEqual({ line: 2, col: 1 });
  });

  it('should handle inserting at the start of a line', () => {
    const result = insertText(['hello'], 0, 0, 'pre');
    expect(result.buffer).toEqual(['prehello']);
    expect(result.cursor).toEqual({ line: 0, col: 3 });
  });

  it('should handle inserting at the end of a line', () => {
    const result = insertText(['hello'], 0, 5, ' world');
    expect(result.buffer).toEqual(['hello world']);
    expect(result.cursor).toEqual({ line: 0, col: 11 });
  });

  it('should handle text ending with a newline', () => {
    const result = insertText(['abc'], 0, 1, 'X\n');
    expect(result.buffer).toEqual(['aX', 'bc']);
    expect(result.cursor).toEqual({ line: 1, col: 0 });
  });

  it('should handle an empty buffer', () => {
    const result = insertText([''], 0, 0, 'hello');
    expect(result.buffer).toEqual(['hello']);
    expect(result.cursor).toEqual({ line: 0, col: 5 });
  });

  it('should handle pasting into a multi-line buffer', () => {
    const result = insertText(['line 1', 'line 2', 'line 3'], 1, 4, ' inserted');
    expect(result.buffer).toEqual(['line 1', 'line inserted 2', 'line 3']);
    expect(result.cursor).toEqual({ line: 1, col: 13 });
  });
});
