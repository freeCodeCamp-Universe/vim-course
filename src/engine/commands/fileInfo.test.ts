import { describe, expect, it } from 'vitest';

import { dispatch } from '../dispatch';
import { createState, markDirty } from '../state';
import type { Cursor, EditorState } from '../types';

function fileAt(lines: string[], path: string, cursor: Cursor): EditorState {
  const seeded = createState(lines, { activeFilePath: path, files: { [path]: lines } });
  return { ...seeded, cursor };
}

describe('Ctrl-G — file position', () => {
  const readme = Array.from({ length: 46 }, (_, i) => `line ${i + 1}`);

  it('should report file, line, total, percentage, and column', () => {
    const state = dispatch(fileAt(readme, 'README.md', { line: 9, col: 2 }), 'Ctrl-g').state;

    expect(state.status).toBe('"README.md" line 10 of 46 --21%-- col 3');
  });

  it('should mark a dirty buffer with [Modified]', () => {
    const dirty = markDirty(fileAt(readme, 'README.md', { line: 9, col: 2 }));
    const state = dispatch(dirty, 'Ctrl-g').state;

    expect(state.status).toBe('"README.md" [Modified] line 10 of 46 --21%-- col 3');
  });

  it('should floor the percentage the way Vim does at the first and last line', () => {
    const first = dispatch(fileAt(readme, 'README.md', { line: 0, col: 0 }), 'Ctrl-g').state;
    expect(first.status).toBe('"README.md" line 1 of 46 --2%-- col 1');

    const last = dispatch(fileAt(readme, 'README.md', { line: 45, col: 0 }), 'Ctrl-g').state;
    expect(last.status).toBe('"README.md" line 46 of 46 --100%-- col 1');
  });

  it('should record a matchable action without editing the buffer', () => {
    const before = fileAt(readme, 'README.md', { line: 9, col: 2 });
    const state = dispatch(before, 'Ctrl-g').state;

    expect(state.history).toContainEqual({ type: 'motion', command: 'Ctrl-g' });
    expect(state.buffer).toEqual(before.buffer);
    expect(state.undoStack).toEqual([]);
  });
});
