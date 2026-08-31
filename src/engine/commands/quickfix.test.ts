import { describe, expect, it } from 'vitest';

import { actionAttempts } from '../actionHistory';
import { dispatch } from '../dispatch';
import { getVirtualFile } from '../filesystem';
import { createState } from '../state';
import type { EditorState } from '../types';

function run(state: EditorState, keys: string[]): EditorState {
  return keys.reduce((current, key) => dispatch(current, key).state, state);
}

function runEx(state: EditorState, commandBody: string): EditorState {
  return run(state, [':', ...commandBody.split(''), 'Enter']);
}

/** Two seeded files, opened on `a.md`, for the cross-file search cases. */
function twoFiles(): EditorState {
  return createState([''], {
    activeFilePath: 'a.md',
    files: { 'a.md': ['foo', 'bar foo'], 'b.md': ['baz', 'foo foo'] },
  });
}

function positions(state: EditorState): Array<[string, number, number]> {
  return (state.quickfix?.entries ?? []).map((entry) => [entry.path, entry.line, entry.col]);
}

describe('vimgrep', () => {
  it('should build a cross-file list, one entry per line, and jump to the first match', () => {
    const state = runEx(twoFiles(), 'vimgrep /foo/ *.md');

    expect(positions(state)).toEqual([
      ['a.md', 0, 0],
      ['a.md', 1, 4],
      ['b.md', 1, 0],
    ]);
    expect(state.quickfix?.index).toBe(0);
    expect(state.mode).toBe('normal');
    expect(state.activeFilePath).toBe('a.md');
    expect(state.cursor).toEqual({ line: 0, col: 0 });
    expect(state.status).toBe('(1 of 3): foo');
    expect(state.history).toContainEqual({ type: 'ex', command: ':vimgrep /foo/ *.md' });
  });

  it('should add every match on a line with the g flag', () => {
    const withoutG = runEx(createState(['foo foo foo']), 'vimgrep /foo/ *');
    const withG = runEx(createState(['foo foo foo']), 'vimgrep /foo/g *');

    expect(withoutG.quickfix?.entries).toHaveLength(1);
    expect(positions(withG)).toEqual([
      ['current.txt', 0, 0],
      ['current.txt', 0, 4],
      ['current.txt', 0, 8],
    ]);
  });

  it('should build the list without moving when the j flag is set', () => {
    const state = runEx(twoFiles(), 'vimgrep /foo/j *.md');

    expect(state.quickfix?.entries).toHaveLength(3);
    expect(state.quickfix?.index).toBe(-1);
    expect(state.cursor).toEqual({ line: 0, col: 0 });
    expect(state.activeFilePath).toBe('a.md');

    const jumped = runEx(state, 'cnext');
    expect(jumped.quickfix?.index).toBe(0);
    expect(jumped.cursor).toEqual({ line: 0, col: 0 });
  });

  it('should mark :vimgrep as a non-attempt', () => {
    const seed = twoFiles();
    const keys = [':', ...'vimgrep /foo/ *.md'.split(''), 'Enter'];
    let state: EditorState = seed;
    let lastActions: ReturnType<typeof dispatch>['actions'] = [];
    for (const key of keys) {
      const step = dispatch(state, key);
      state = step.state;
      lastActions = step.actions;
    }
    const exAction = lastActions.find((a) => a.command !== undefined);
    expect(exAction, ':vimgrep should produce an action').toBeDefined();
    expect(actionAttempts.get(exAction!)).toBe(false);
  });

  it('should mark a no-match :vimgrep as a non-attempt', () => {
    const seed = twoFiles();
    const keys = [':', ...'vimgrep /zzz/ *.md'.split(''), 'Enter'];
    let state: EditorState = seed;
    let lastActions: ReturnType<typeof dispatch>['actions'] = [];
    for (const key of keys) {
      const step = dispatch(state, key);
      state = step.state;
      lastActions = step.actions;
    }
    const exAction = lastActions.find((a) => a.command !== undefined);
    expect(exAction, 'no-match :vimgrep should produce an action').toBeDefined();
    expect(actionAttempts.get(exAction!)).toBe(false);
  });

  it('should report E480 and preserve the previous list when nothing matches', () => {
    const withList = runEx(twoFiles(), 'vimgrep /foo/ *.md');
    const state = runEx(withList, 'vimgrep /zzz/ *.md');

    expect(state.status).toBe('E480: No match: zzz');
    expect(state.statusIsError).toBe(true);
    expect(positions(state)).toEqual(positions(withList));
    expect(state.history).toContainEqual({ type: 'ex', command: ':vimgrep /zzz/ *.md' });
  });
});

describe('grep', () => {
  it('should build a list from slash-free syntax and jump', () => {
    const state = runEx(twoFiles(), 'grep foo *.md');

    expect(state.quickfix?.entries).toHaveLength(3);
    expect(state.quickfix?.index).toBe(0);
    expect(state.cursor).toEqual({ line: 0, col: 0 });
    expect(state.history).toContainEqual({ type: 'ex', command: ':grep foo *.md' });
  });

  it('should suppress the jump with grep!', () => {
    const state = runEx(twoFiles(), 'grep! foo *.md');

    expect(state.quickfix?.index).toBe(-1);
    expect(state.cursor).toEqual({ line: 0, col: 0 });
  });
});

describe('quickfix navigation', () => {
  it('should step forward across files with :cnext', () => {
    const first = runEx(twoFiles(), 'vimgrep /foo/ *.md');
    const second = runEx(first, 'cnext');
    const third = runEx(second, 'cnext');

    expect(second.cursor).toEqual({ line: 1, col: 4 });
    expect(second.activeFilePath).toBe('a.md');
    expect(third.activeFilePath).toBe('b.md');
    expect(third.cursor).toEqual({ line: 1, col: 0 });
    expect(third.status).toBe('(3 of 3): foo foo');
  });

  it('should step back with :cprev', () => {
    const atEnd = run(twoFiles(), []);
    const listed = runEx(atEnd, 'vimgrep /foo/ *.md');
    const advanced = runEx(runEx(listed, 'cnext'), 'cnext');
    const back = runEx(advanced, 'cprev');

    expect(back.quickfix?.index).toBe(1);
    expect(back.activeFilePath).toBe('a.md');
    expect(back.cursor).toEqual({ line: 1, col: 4 });
  });

  it('should not wrap: :cnext past the last item reports E553', () => {
    const listed = runEx(twoFiles(), 'vimgrep /foo/ *.md');
    const atEnd = runEx(runEx(listed, 'cnext'), 'cnext');
    const past = runEx(atEnd, 'cnext');

    expect(past.status).toBe('E553: No more items');
    expect(past.quickfix?.index).toBe(2);
    expect(past.history.filter((a) => a.command === ':cnext')).toHaveLength(2);
  });

  it('should not wrap: :cprev before the first item reports E553', () => {
    const listed = runEx(twoFiles(), 'vimgrep /foo/ *.md');
    const past = runEx(listed, 'cprev');

    expect(past.status).toBe('E553: No more items');
    expect(past.quickfix?.index).toBe(0);
  });

  it('should jump to a specific entry with :cc {nr}', () => {
    const listed = runEx(twoFiles(), 'vimgrep /foo/ *.md');
    const state = runEx(listed, 'cc 3');

    expect(state.quickfix?.index).toBe(2);
    expect(state.activeFilePath).toBe('b.md');
  });

  it('should report E42 for navigation with no list', () => {
    const state = runEx(createState(['foo']), 'cnext');

    expect(state.status).toBe('E42: No Errors');
    expect(state.quickfix).toBeNull();
  });

  it('should not let u restore the previous file into the one a cross-file jump opened', () => {
    const listed = runEx(twoFiles(), 'vimgrep /foo/ *.md');
    const onB = runEx(runEx(listed, 'cnext'), 'cnext');
    expect(onB.activeFilePath).toBe('b.md');
    expect(onB.undoStack).toHaveLength(0);

    const undone = dispatch(onB, 'u').state;
    expect(undone.activeFilePath).toBe('b.md');
    expect(undone.buffer).toEqual(['baz', 'foo foo']);
  });

  it('should mark :cnext, :cprev, and :cc as non-attempts', () => {
    const listed = runEx(twoFiles(), 'vimgrep /foo/ *.md');
    // Advance past the first entry so :cprev has room to step back.
    const advanced = runEx(listed, 'cnext');

    for (const [base, command] of [
      [listed, 'cnext'],
      [advanced, 'cprev'],
      [listed, 'cc 2'],
    ] as const) {
      const keys = [':', ...command.split(''), 'Enter'];
      let state: EditorState = base;
      let lastActions: ReturnType<typeof dispatch>['actions'] = [];
      for (const key of keys) {
        const step = dispatch(state, key);
        state = step.state;
        lastActions = step.actions;
      }
      const exAction = lastActions.find((a) => a.command !== undefined);
      expect(exAction, `${command} should produce an action`).toBeDefined();
      expect(actionAttempts.get(exAction!)).toBe(false);
    }
  });

  it('should refuse to jump into another file with unsaved edits (E37)', () => {
    const seed = createState([''], {
      activeFilePath: 'a.md',
      files: { 'a.md': ['foo'], 'b.md': ['foo', 'foo'] },
    });
    const listed = runEx(seed, 'vimgrep /foo/ *.md');
    const dirtied = dispatch(listed, 'x').state;
    const blocked = runEx(dirtied, 'cnext');

    expect(blocked.status).toBe('E37: No write since last change');
    expect(blocked.activeFilePath).toBe('a.md');
    expect(blocked.quickfix?.index).toBe(0);
    expect(blocked.history).not.toContainEqual({ type: 'ex', command: ':cnext' });
  });
});

describe(':clist', () => {
  it('should open the listing and record the command', () => {
    const listed = runEx(twoFiles(), 'vimgrep /foo/ *.md');
    const shown = runEx(listed, 'clist');

    expect(shown.quickfixListing).toBe(true);
    expect(shown.history).toContainEqual({ type: 'ex', command: ':clist' });
  });

  it('should mark :clist as a non-attempt', () => {
    const listed = runEx(twoFiles(), 'vimgrep /foo/ *.md');
    const keys = [':', ...'clist'.split(''), 'Enter'];
    let state: EditorState = listed;
    let lastActions: ReturnType<typeof dispatch>['actions'] = [];
    for (const key of keys) {
      const step = dispatch(state, key);
      state = step.state;
      lastActions = step.actions;
    }
    const exAction = lastActions.find((a) => a.command !== undefined);
    expect(exAction).toBeDefined();
    expect(actionAttempts.get(exAction!)).toBe(false);
  });

  it('should scroll down with j/d/Space and up with k/u/b without closing', () => {
    // Seed enough entries for the pager to have room to scroll (>20).
    const manyEntries = createState([''], {
      activeFilePath: 'a.md',
      files: {
        'a.md': Array.from({ length: 30 }, (_, i) => `line ${i}`),
      },
    });
    const listed = runEx(manyEntries, 'vimgrep /line/ *.md');
    const shown = runEx(listed, 'clist');
    expect(shown.quickfixScrollOffset).toBe(0);

    // j — one line down
    const afterJResult = dispatch(shown, 'j');
    const afterJ = afterJResult.state;
    expect(afterJ.quickfixListing).toBe(true);
    expect(afterJ.quickfixScrollOffset).toBe(1);
    expect(afterJResult.actions).toEqual([]); // scroll keys emit no actions

    // k — one line up
    const afterK = dispatch(afterJ, 'k').state;
    expect(afterK.quickfixScrollOffset).toBe(0);

    // Space — full page down (clamped to max offset: 30 entries - 20 per page = 10)
    const afterSpace = dispatch(shown, ' ').state;
    expect(afterSpace.quickfixScrollOffset).toBe(10);

    // b — full page up
    const afterB = dispatch(afterSpace, 'b').state;
    expect(afterB.quickfixScrollOffset).toBe(0);

    // d — half page down
    const afterD = dispatch(shown, 'd').state;
    expect(afterD.quickfixScrollOffset).toBe(10);

    // u — half page up
    const afterU = dispatch(afterD, 'u').state;
    expect(afterU.quickfixScrollOffset).toBe(0);
  });

  it('should not scroll past the last entry or before the first', () => {
    const manyEntries = createState([''], {
      activeFilePath: 'a.md',
      files: { 'a.md': Array.from({ length: 25 }, (_, i) => `x ${i}`) },
    });
    const shown = runEx(runEx(manyEntries, 'vimgrep /x/ *.md'), 'clist');

    // Space pages down; second Space should clamp at the max offset (25 - 20 = 5).
    const page1 = dispatch(shown, ' ').state;
    expect(page1.quickfixScrollOffset).toBe(5); // clamped: max(0, 25-20) = 5
    const page2 = dispatch(page1, ' ').state;
    expect(page2.quickfixScrollOffset).toBe(5); // already at max

    // k at offset 0 should stay at 0.
    const still = dispatch(shown, 'k').state;
    expect(still.quickfixScrollOffset).toBe(0);
  });

  it('should dismiss a short list on any non-: key (Press ENTER behavior)', () => {
    // twoFiles() yields 3 quickfix entries — well under the 20-entry page size.
    const listed = runEx(twoFiles(), 'vimgrep /foo/ *.md');
    const shown = runEx(listed, 'clist');
    const cursorBefore = shown.cursor;

    for (const key of ['Enter', 'n', 'G', 'x', 'j', ' ']) {
      const result = dispatch(shown, key);
      expect(result.state.quickfixListing).toBe(false);
      expect(result.state.quickfixScrollOffset).toBe(0);
      expect(result.actions).toEqual([]);
      expect(result.state.cursor).toEqual(cursorBefore);
    }
  });

  it('should show the pager hint on a long list when an unknown key is pressed', () => {
    const manyEntries = createState([''], {
      activeFilePath: 'a.md',
      files: { 'a.md': Array.from({ length: 25 }, (_, i) => `x ${i}`) },
    });
    const shown = runEx(runEx(manyEntries, 'vimgrep /x/ *.md'), 'clist');
    const cursorBefore = shown.cursor;

    for (const key of ['n', 'G', 'x', 'w']) {
      const result = dispatch(shown, key);
      expect(result.state.quickfixListing).toBe(true);
      expect(result.state.status).toBe(
        '-- More -- SPACE/d/j: screen/page/line down, b/u/k: up, q: quit'
      );
      expect(result.actions).toEqual([]);
      expect(result.state.cursor).toEqual(cursorBefore);
    }
  });

  it('should dismiss the listing on q or Escape and reset the scroll offset', () => {
    const listed = runEx(twoFiles(), 'vimgrep /foo/ *.md');
    const shown = runEx(listed, 'clist');
    const cursorBefore = shown.cursor;

    for (const key of ['q', 'Escape']) {
      const result = dispatch(shown, key);
      expect(result.state.quickfixListing).toBe(false);
      expect(result.state.quickfixScrollOffset).toBe(0);
      expect(result.actions).toEqual([]);
      expect(result.state.cursor).toEqual(cursorBefore);
    }
  });

  it('should enter command-line mode on : while keeping the listing visible', () => {
    const listed = runEx(twoFiles(), 'vimgrep /foo/ *.md');
    const shown = runEx(listed, 'clist');

    const result = dispatch(shown, ':');

    // Listing stays up so the user can see entries while typing the command.
    expect(result.state.quickfixListing).toBe(true);
    expect(result.state.mode).toBe('command-line');
  });

  it('should close the listing and navigate when :cn is executed from within it', () => {
    const listed = runEx(twoFiles(), 'vimgrep /foo/ *.md');
    const shown = runEx(listed, 'clist');

    // `:` opens command-line while listing stays; cn<Enter> executes and closes it.
    const afterCn = run(shown, [':', 'c', 'n', 'Enter']);

    expect(afterCn.quickfix?.index).toBe(1);
    expect(afterCn.quickfixListing).toBe(false);
  });

  it('should keep the listing visible when Escape cancels the command-line', () => {
    const listed = runEx(twoFiles(), 'vimgrep /foo/ *.md');
    const shown = runEx(listed, 'clist');

    // `:` then Escape cancels without closing the listing.
    const afterEscape = run(shown, [':', 'Escape']);

    expect(afterEscape.quickfixListing).toBe(true);
    expect(afterEscape.mode).toBe('normal');
  });

  it('should report E42 when there is no list to show', () => {
    const state = runEx(createState(['foo']), 'clist');

    expect(state.status).toBe('E42: No Errors');
    expect(state.quickfixListing).toBe(false);
  });
});

describe(':cdo', () => {
  it('should report E42 when there is no quickfix list', () => {
    const state = runEx(createState(['fork']), 'cdo s/fork/pipe/g');

    expect(state.status).toBe('E42: No Errors');
  });

  it('should run the command for every entry across multiple files', () => {
    const listed = runEx(
      createState([''], {
        activeFilePath: 'a.md',
        files: { 'a.md': ['fork', 'keep fork'], 'b.md': ['fork'] },
      }),
      'vimgrep /fork/ *.md'
    );
    const state = runEx(listed, 'cdo s/fork/pipe/g');

    expect(getVirtualFile(state.files, 'a.md')?.contents).toEqual(['pipe', 'keep pipe']);
    expect(getVirtualFile(state.files, 'b.md')?.contents).toEqual(['pipe']);
    expect(getVirtualFile(state.files, 'a.md')?.dirty).toBe(true);
    expect(getVirtualFile(state.files, 'b.md')?.dirty).toBe(true);
    expect(state.quickfix?.index).toBe(2);
    expect(state.history).toContainEqual({ type: 'ex', command: ':cdo s/fork/pipe/g' });
  });

  it('should replace and save every touched file with a chained update', () => {
    const listed = runEx(
      createState([''], {
        activeFilePath: 'a.md',
        files: { 'a.md': ['fork', 'keep fork'], 'b.md': ['fork'] },
      }),
      'vimgrep /fork/ *.md'
    );
    const state = runEx(listed, 'cdo s/fork/pipe/g | update');

    expect(getVirtualFile(state.files, 'a.md')?.contents).toEqual(['pipe', 'keep pipe']);
    expect(getVirtualFile(state.files, 'b.md')?.contents).toEqual(['pipe']);
    expect(getVirtualFile(state.files, 'a.md')?.dirty).toBe(false);
    expect(getVirtualFile(state.files, 'b.md')?.dirty).toBe(false);
    expect(getVirtualFile(state.files, 'a.md')?.written).toBe(true);
    expect(getVirtualFile(state.files, 'b.md')?.written).toBe(true);
    expect(state.dirty).toBe(false);
  });

  it('should stop when the inner command errors', () => {
    const listed = runEx(twoFiles(), 'vimgrep /foo/ *.md');
    const state = runEx(listed, 'cdo invalid-command');

    expect(state.status).toBe('E492: Not an editor command: :invalid-command');
    expect(state.quickfix?.index).toBe(0);
    expect(state.history).not.toContainEqual(
      expect.objectContaining({ type: 'ex', command: expect.stringContaining(':cdo') })
    );
  });

  it('should work with a single-entry list', () => {
    const listed = runEx(createState(['fork']), 'vimgrep /fork/ *');
    const state = runEx(listed, 'cdo s/fork/pipe/g');

    expect(state.buffer).toEqual(['pipe']);
    expect(state.quickfix?.index).toBe(0);
  });

  it('should mark :cdo as a non-attempt', () => {
    const listed = runEx(
      createState([''], {
        activeFilePath: 'a.md',
        files: { 'a.md': ['fork'], 'b.md': ['fork'] },
      }),
      'vimgrep /fork/ *.md'
    );
    const keys = [':', ...'cdo s/fork/pipe/g'.split(''), 'Enter'];
    let state: EditorState = listed;
    let lastActions: ReturnType<typeof dispatch>['actions'] = [];
    for (const key of keys) {
      const step = dispatch(state, key);
      state = step.state;
      lastActions = step.actions;
    }
    const exAction = lastActions.find((a) => a.command !== undefined);
    expect(exAction, ':cdo should produce an action').toBeDefined();
    expect(actionAttempts.get(exAction!)).toBe(false);
  });
});
