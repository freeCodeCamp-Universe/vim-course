import { describe, expect, it } from 'vitest';

import { createVirtualFilesystem } from './filesystem';
import { dispatch } from './dispatch';
import { createState } from './state';
import type { EditorState } from './types';

function run(state: EditorState, keys: string[]): EditorState {
  return keys.reduce((current, key) => dispatch(current, key).state, state);
}

function runEx(state: EditorState, commandBody: string): EditorState {
  return run(state, [':', ...commandBody.split(''), 'Enter']);
}

describe('createVirtualFilesystem', () => {
  it('should preserve an empty activeFilePath for shell/splash lessons', () => {
    const { activeFilePath } = createVirtualFilesystem([''], {
      activeFilePath: '',
      files: { 'about-vim.md': ['Vim was created by Bram Moolenaar.'] },
    });

    expect(activeFilePath).toBe('');
  });

  it('should fall back to the first file when activeFilePath is undefined', () => {
    const { activeFilePath } = createVirtualFilesystem([''], {
      files: { 'about-vim.md': ['Vim was created by Bram Moolenaar.'] },
    });

    expect(activeFilePath).toBe('about-vim.md');
  });
});

describe('virtual filesystem via :e and :w', () => {
  it('should open an existing file with :e <path>', () => {
    const seeded = createState(['fallback'], {
      activeFilePath: 'other.txt',
      files: {
        'existing.txt': ['alpha'],
        'other.txt': ['beta'],
      },
    });

    const state = runEx(seeded, 'e existing.txt');

    expect(state.activeFilePath).toBe('existing.txt');
    expect(state.buffer).toEqual(['alpha']);
    expect(state.dirty).toBe(false);
  });

  it('should open a new file as an empty buffer with :e <path>', () => {
    const state = runEx(createState(['alpha']), 'e new.txt');
    const created = state.files.get('new.txt');

    expect(state.activeFilePath).toBe('new.txt');
    expect(state.buffer).toEqual(['']);
    expect(state.dirty).toBe(false);
    expect(created?.saved).toEqual(['']);
    expect(created?.onDisk).toBe(false);
  });

  it('should report "<path>" [New] when :e opens a path with nothing on disk', () => {
    const state = runEx(createState(['alpha']), 'e new.md');

    expect(state.status).toBe('"new.md" [New]');
  });

  it('should keep reporting [New] until the new file is written', () => {
    const created = runEx(createState(['alpha'], { activeFilePath: 'a.txt' }), 'e new.md');
    const reopened = runEx(runEx(created, 'e a.txt'), 'e new.md');
    const written = runEx(reopened, 'w');
    const afterWrite = runEx(runEx(written, 'e a.txt'), 'e new.md');

    expect(reopened.status).toBe('"new.md" [New]');
    expect(written.files.get('new.md')?.onDisk).toBe(true);
    expect(afterWrite.status).toBe('');
  });

  it('should report no indicator when :e opens a file that exists', () => {
    const seeded = createState(['fallback'], {
      activeFilePath: 'other.txt',
      files: { 'existing.txt': ['alpha'], 'other.txt': ['beta'] },
    });

    const state = runEx(seeded, 'e existing.txt');

    expect(state.status).toBe('');
    expect(state.files.get('existing.txt')?.onDisk).toBe(true);
  });

  it('should persist writes and reopen the file with its saved contents', () => {
    const seeded = createState(['start'], {
      activeFilePath: 'note.txt',
      files: {
        'note.txt': ['start'],
      },
    });

    const edited = run(seeded, ['i', 'X', 'Escape']);
    const written = runEx(edited, 'w');
    const switched = runEx(written, 'e scratch.txt');
    const reopened = runEx(switched, 'e note.txt');

    expect(written.dirty).toBe(false);
    expect(written.files.get('note.txt')?.saved).toEqual(['Xstart']);
    expect(reopened.buffer).toEqual(['Xstart']);
    expect(reopened.dirty).toBe(false);
  });

  it('should preserve each file state while switching between saved files', () => {
    const seeded = createState(['one'], {
      activeFilePath: 'a.txt',
      files: {
        'a.txt': ['one'],
        'b.txt': ['two'],
      },
    });

    const editedA = runEx(runEx(run(seeded, ['i', 'A', 'Escape']), 'w'), 'e b.txt');
    const editedB = runEx(run(editedA, ['i', 'B', 'Escape']), 'w');
    const backToA = runEx(editedB, 'e a.txt');
    const backToB = runEx(backToA, 'e b.txt');

    expect(backToA.buffer).toEqual(['Aone']);
    expect(backToA.dirty).toBe(false);
    expect(backToB.buffer).toEqual(['Btwo']);
    expect(backToB.dirty).toBe(false);
  });

  it('should allow :e to reopen the same file while the buffer has unsaved edits', () => {
    const seeded = createState(['one'], {
      activeFilePath: 'a.txt',
      files: { 'a.txt': ['one'], 'b.txt': ['two'] },
    });

    const state = runEx(run(seeded, ['i', 'A', 'Escape']), 'e a.txt');

    expect(state.activeFilePath).toBe('a.txt');
    expect(state.buffer).toEqual(['Aone']);
    expect(state.dirty).toBe(true);
    expect(state.statusIsError).toBe(false);
  });

  it('should refuse :e with E37 while the buffer has unsaved edits', () => {
    const seeded = createState(['one'], {
      activeFilePath: 'a.txt',
      files: { 'a.txt': ['one'], 'b.txt': ['two'] },
    });

    const state = runEx(run(seeded, ['i', 'A', 'Escape']), 'e b.txt');

    expect(state.status).toBe('E37: No write since last change');
    expect(state.activeFilePath).toBe('a.txt');
    expect(state.buffer).toEqual(['Aone']);
    expect(state.dirty).toBe(true);
  });

  it('should not record a refused :e, so a checklist item cannot latch on it', () => {
    const seeded = createState(['one'], {
      activeFilePath: 'a.txt',
      files: { 'a.txt': ['one'], 'b.txt': ['two'] },
    });

    const state = runEx(run(seeded, ['i', 'A', 'Escape']), 'e b.txt');

    expect(state.history).not.toContainEqual({ type: 'ex', command: ':e b.txt' });
  });

  it('should let :e through once the edits are written', () => {
    const seeded = createState(['one'], {
      activeFilePath: 'a.txt',
      files: { 'a.txt': ['one'], 'b.txt': ['two'] },
    });

    const written = runEx(run(seeded, ['i', 'A', 'Escape']), 'w');
    const state = runEx(written, 'e b.txt');

    expect(state.activeFilePath).toBe('b.txt');
    expect(state.buffer).toEqual(['two']);
    expect(state.files.get('a.txt')?.saved).toEqual(['Aone']);
  });

  it('should discard the unsaved edits when :e! overrides the refusal', () => {
    const seeded = createState(['one'], {
      activeFilePath: 'a.txt',
      files: { 'a.txt': ['one'], 'b.txt': ['two'] },
    });

    const forced = runEx(run(seeded, ['i', 'A', 'Escape']), 'e! b.txt');
    const backToA = runEx(forced, 'e a.txt');

    expect(forced.activeFilePath).toBe('b.txt');
    expect(forced.dirty).toBe(false);
    expect(forced.history).toContainEqual({ type: 'ex', command: ':e! b.txt' });
    expect(backToA.buffer).toEqual(['one']);
    expect(backToA.dirty).toBe(false);
  });

  it('should still ask for an argument on a bare :e or :e!', () => {
    const state = createState(['one']);

    expect(runEx(state, 'e').status).toBe('E471: Argument required');
    expect(runEx(state, 'e!').status).toBe('E471: Argument required');
  });
});
