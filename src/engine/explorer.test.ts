import { describe, expect, it } from 'vitest';

import { dispatch, type AllowedCommands } from './dispatch';
import { createState } from './state';
import type { EditorState } from './types';

function run(state: EditorState, keys: string[]): EditorState {
  return keys.reduce((current, key) => dispatch(current, key).state, state);
}

function runEx(state: EditorState, commandBody: string): EditorState {
  return run(state, [':', ...commandBody.split(''), 'Enter']);
}

function explore(): EditorState {
  const seeded = createState(['alpha'], {
    activeFilePath: 'b.txt',
    files: {
      'b.txt': ['alpha'],
      'a.txt': ['beta'],
      'c.txt': ['gamma'],
    },
  });

  return runEx(seeded, 'Explore');
}

function exploreFiles(
  files: Record<string, string[]>,
  activeFilePath = Object.keys(files).find((path) => !path.includes('/')) ??
    Object.keys(files)[0] ??
    ''
): EditorState {
  const seeded = createState(files[activeFilePath] ?? [''], {
    activeFilePath,
    files,
  });

  return runEx(seeded, 'Explore');
}

describe('netrw explorer via :Explore', () => {
  it('should list the virtual files sorted and select the active file', () => {
    const state = explore();

    expect(state.mode).toBe('explorer');
    expect(state.explorer?.entries).toEqual(['a.txt', 'b.txt', 'c.txt']);
    expect(state.explorer?.selected).toBe(1);
    expect(state.buffer).toEqual(['a.txt', 'b.txt', 'c.txt']);
    expect(state.cursor).toEqual({ line: 1, col: 0 });
  });

  it('should omit a buffer opened on a path that is not on disk', () => {
    const seeded = createState(['alpha'], {
      activeFilePath: 'a.txt',
      files: { 'a.txt': ['alpha'] },
    });

    const state = runEx(runEx(seeded, 'e ghost.txt'), 'Explore');

    expect(state.explorer?.entries).toEqual(['a.txt']);
    expect(state.explorer?.selected).toBe(0);
  });

  it('should list a new file once it has been written', () => {
    const seeded = createState(['alpha'], {
      activeFilePath: 'a.txt',
      files: { 'a.txt': ['alpha'] },
    });

    const state = runEx(runEx(runEx(seeded, 'e ghost.txt'), 'w'), 'Explore');

    expect(state.explorer?.entries).toEqual(['a.txt', 'ghost.txt']);
  });

  it('should move the selection down with j and up with k', () => {
    const down = run(explore(), ['j']);
    expect(down.explorer?.selected).toBe(2);
    expect(down.cursor).toEqual({ line: 2, col: 0 });

    const upAgain = run(down, ['k', 'k']);
    expect(upAgain.explorer?.selected).toBe(0);
    expect(upAgain.cursor).toEqual({ line: 0, col: 0 });
  });

  it('should move the selection with the ArrowDown and ArrowUp keys', () => {
    const down = run(explore(), ['ArrowDown']);
    expect(down.explorer?.selected).toBe(2);

    const upAgain = run(down, ['ArrowUp', 'ArrowUp']);
    expect(upAgain.explorer?.selected).toBe(0);
  });

  it('should clamp the selection at the top and bottom of the listing', () => {
    const top = run(explore(), ['k', 'k', 'k']);
    expect(top.explorer?.selected).toBe(0);

    const bottom = run(explore(), ['j', 'j', 'j', 'j']);
    expect(bottom.explorer?.selected).toBe(2);
  });

  it('should open the selected file into the buffer on Enter', () => {
    const opened = run(explore(), ['j', 'Enter']);

    expect(opened.mode).toBe('normal');
    expect(opened.activeFilePath).toBe('c.txt');
    expect(opened.buffer).toEqual(['gamma']);
    expect(opened.cursor).toEqual({ line: 0, col: 0 });
    expect(opened.explorer).toBeNull();
  });

  it('should reopen the current file from the explorer when the buffer has unsaved edits', () => {
    const dirty = runEx(run(explore(), ['Enter', 'i', 'X', 'Escape']), 'Explore');
    const reopened = run(dirty, ['Enter']);

    expect(reopened.mode).toBe('normal');
    expect(reopened.activeFilePath).toBe('b.txt');
    expect(reopened.buffer).toEqual(['Xalpha']);
    expect(reopened.dirty).toBe(true);
    expect(reopened.explorer).toBeNull();
    expect(reopened.statusIsError).toBe(false);
  });

  it('should refuse Enter with E37 while the buffer has unsaved edits', () => {
    const dirty = runEx(run(explore(), ['Enter', 'i', 'X', 'Escape']), 'Explore');
    const refused = run(dirty, ['j', 'Enter']);

    expect(refused.status).toBe('E37: No write since last change');
    expect(refused.mode).toBe('explorer');
    expect(refused.activeFilePath).toBe('b.txt');
    expect(refused.history).not.toContainEqual({ type: 'ex', command: ':e c.txt' });
  });

  it('should ignore keys other than j/k/Enter, reporting each as unsupported', () => {
    const before = explore();
    const after = run(before, ['x', 'i', 'd', 'd', 'l', 'h', ':', 'G']);

    expect(after.mode).toBe('explorer');
    expect(after.explorer).toEqual(before.explorer);
    expect(after.buffer).toEqual(before.buffer);
    expect(after.cursor).toEqual(before.cursor);
    // `G` works in a file buffer, so the listing refuses it by mode rather than
    // telling the learner a command they have been taught does not exist.
    expect(after.status).toBe('G is not supported in the file explorer in this lesson');
  });

  it('should use the plain wording for a key the lesson simulates nowhere', () => {
    const after = run(explore(), ['f']);

    expect(after.status).toBe('f is not supported in this lesson');
  });

  it('should not enter insert mode when i is pressed in explorer state', () => {
    const after = run(explore(), ['i', 'z']);

    expect(after.mode).toBe('explorer');
    expect(after.buffer).toEqual(['a.txt', 'b.txt', 'c.txt']);
  });

  it('should show root files and deduplicated directories', () => {
    const state = exploreFiles({
      'a.txt': ['a'],
      'bar/foo.md': ['foo'],
      'bar/baz.md': ['baz'],
      'qux/deep/x.txt': ['x'],
    });

    expect(state.explorer?.entries).toEqual(['a.txt', 'bar/', 'qux/']);
  });

  it('should enter a directory with Enter', () => {
    const state = run(
      exploreFiles({
        'root.txt': ['root'],
        'bar/foo.md': ['foo'],
        'bar/baz.md': ['baz'],
      }),
      ['k', 'Enter']
    );

    expect(state.mode).toBe('explorer');
    expect(state.explorer?.cwd).toBe('bar/');
    expect(state.explorer?.entries).toEqual(['../', 'baz.md', 'foo.md']);
    expect(state.buffer).toEqual(['../', 'baz.md', 'foo.md']);
    expect(state.explorer?.selected).toBe(0);
  });

  it('should navigate to the parent directory with ../', () => {
    const inside = run(exploreFiles({ 'root.txt': ['root'], 'bar/foo.md': ['foo'] }), [
      'k',
      'Enter',
    ]);
    const root = run(inside, ['Enter']);

    expect(root.mode).toBe('explorer');
    expect(root.explorer?.cwd).toBe('');
    expect(root.explorer?.entries).toEqual(['bar/', 'root.txt']);
    expect(root.explorer?.selected).toBe(0);
  });

  it('should open a file from inside a directory with its full path', () => {
    const inside = run(
      exploreFiles({
        'root.txt': ['root'],
        'bar/foo.md': ['foo'],
        'bar/baz.md': ['baz'],
      }),
      ['k', 'Enter']
    );
    const opened = run(inside, ['j', 'j', 'Enter']);

    expect(opened.mode).toBe('normal');
    expect(opened.activeFilePath).toBe('bar/foo.md');
    expect(opened.buffer).toEqual(['foo']);
  });

  it('should navigate nested directories', () => {
    const root = exploreFiles({ 'root.txt': ['root'], 'a/b/c.txt': ['c'] });
    const insideA = run(root, ['k', 'Enter']);
    const insideB = run(insideA, ['j', 'Enter']);

    expect(insideA.explorer?.entries).toEqual(['../', 'b/']);
    expect(insideB.explorer?.cwd).toBe('a/b/');
    expect(insideB.explorer?.entries).toEqual(['../', 'c.txt']);
  });

  it('should navigate to the parent directory with the - key', () => {
    const inside = run(exploreFiles({ 'root.txt': ['root'], 'bar/foo.md': ['foo'] }), [
      'k',
      'Enter',
    ]);
    const root = run(inside, ['-']);

    expect(root.explorer?.cwd).toBe('');
    expect(root.explorer?.selected).toBe(0);
  });

  it('should no-op when - is pressed at the root', () => {
    const before = exploreFiles({ 'a.txt': ['a'] });
    const after = run(before, ['-']);

    expect(after).toEqual(before);
  });

  it('should derive the explorer cwd from the active file path', () => {
    const state = exploreFiles({ 'bar/foo.md': ['foo'], 'bar/baz.md': ['baz'] }, 'bar/foo.md');

    expect(state.explorer?.cwd).toBe('bar/');
    expect(state.explorer?.entries).toEqual(['../', 'baz.md', 'foo.md']);
    expect(state.explorer?.selected).toBe(2);
  });

  it('should select the directory just left when navigating up', () => {
    const inside = run(
      exploreFiles({
        'root.txt': ['root'],
        'bar/foo.md': ['foo'],
        'qux.md': ['qux'],
      }),
      ['k', 'k', 'Enter']
    );
    const root = run(inside, ['Enter']);

    expect(root.explorer?.entries).toEqual(['bar/', 'qux.md', 'root.txt']);
    expect(root.explorer?.selected).toBe(0);
  });

  describe('arrow key filtering in explorer mode', () => {
    const denyArrows: AllowedCommands = (command) =>
      ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(command)
        ? { reason: 'deny' }
        : true;

    it('should block ArrowDown when the filter denies it', () => {
      const state = explore();
      const { state: after, actions } = dispatch(state, 'ArrowDown', {
        allowedCommands: denyArrows,
      });

      expect(after.explorer?.selected).toBe(state.explorer?.selected);
      expect(actions).toEqual([{ type: 'filtered', command: 'ArrowDown' }]);
    });

    it('should block ArrowUp when the filter denies it', () => {
      const state = run(explore(), ['j']);
      const { state: after, actions } = dispatch(state, 'ArrowUp', {
        allowedCommands: denyArrows,
      });

      expect(after.explorer?.selected).toBe(state.explorer?.selected);
      expect(actions).toEqual([{ type: 'filtered', command: 'ArrowUp' }]);
    });

    it('should still allow j and k when only arrows are denied', () => {
      const state = explore();
      const { state: down } = dispatch(state, 'j', {
        allowedCommands: denyArrows,
      });

      expect(down.explorer?.selected).toBe((state.explorer?.selected ?? 0) + 1);

      const { state: up } = dispatch(down, 'k', {
        allowedCommands: denyArrows,
      });

      expect(up.explorer?.selected).toBe(state.explorer?.selected);
    });
  });
});
