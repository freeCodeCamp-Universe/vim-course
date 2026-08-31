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

describe('ex commands', () => {
  it('should execute :w and clear dirty state', () => {
    const state = runEx({ ...createState(['edited']), dirty: true }, 'w');

    expect(state.dirty).toBe(false);
    expect(state.mode).not.toBe('shell');
    expect(state.history).toContainEqual({ type: 'ex', command: ':w' });
  });

  it('should execute :update and clear dirty state', () => {
    const state = runEx({ ...createState(['edited']), dirty: true }, 'update');

    expect(state.dirty).toBe(false);
    expect(state.history).toContainEqual({ type: 'ex', command: ':update' });
  });

  it('should leave a clean buffer unchanged for :update', () => {
    const initial = createState(['clean']);
    const state = runEx(initial, 'update');

    expect(state.buffer).toEqual(initial.buffer);
    expect(state.dirty).toBe(initial.dirty);
    expect(state.history).not.toContainEqual({ type: 'ex', command: ':update' });
  });

  it('should run a substitution and update when commands are chained', () => {
    const state = runEx({ ...createState(['foo']), dirty: false }, 's/foo/bar/g | update');

    expect(state.buffer).toEqual(['bar']);
    expect(state.dirty).toBe(false);
    expect(state.history).toContainEqual({ type: 'ex', command: ':s/foo/bar/g' });
    expect(state.history).toContainEqual({ type: 'ex', command: ':update' });
  });

  it('should block :q on a dirty buffer with E37 and record no action', () => {
    const state = runEx({ ...createState(['edited']), dirty: true }, 'q');

    expect(state.mode).not.toBe('shell');
    expect(state.status).toBe('E37: No write since last change');
    // A refused :q records nothing, matching a refused :e, so a `quit` item never
    // latches on a quit Vim rejected.
    expect(state.history).not.toContainEqual({ type: 'ex', command: ':q' });
  });

  it('should allow :q on a clean buffer', () => {
    const state = runEx(createState(['clean']), 'q');

    expect(state.mode).toBe('shell');
    expect(state.status).toBe('');
  });

  it('should quit on :q! regardless of dirty state, discarding the unsaved edits', () => {
    const seeded = createState(['saved']);
    const state = runEx({ ...seeded, buffer: ['edited'], dirty: true }, 'q!');

    expect(state.mode).toBe('shell');
    expect(state.dirty).toBe(false);
    expect(getVirtualFile(state.files, state.activeFilePath)?.contents).toEqual(['saved']);
    expect(state.history).toContainEqual({ type: 'ex', command: ':q!' });
  });

  it('should execute :wq by writing and then dropping to the shell', () => {
    const state = runEx({ ...createState(['edited']), dirty: true }, 'wq');

    expect(state.dirty).toBe(false);
    expect(state.mode).toBe('shell');
    expect(state.history).toContainEqual({ type: 'ex', command: ':wq' });
  });

  it('should report malformed commands and preserve editor state', () => {
    const initial = { ...createState(['one', 'two']), cursor: { line: 1, col: 1 } };
    const state = runEx(initial, 'not-a-command');

    expect(state.buffer).toEqual(initial.buffer);
    expect(state.cursor).toEqual(initial.cursor);
    expect(state.dirty).toBe(initial.dirty);
    expect(state.mode).not.toBe('shell');
    expect(state.status).toBe('E492: Not an editor command: :not-a-command');
  });

  it('should substitute all matches with :%s/old/new/g', () => {
    const state = runEx(createState(['old old', 'keep', 'old']), '%s/old/new/g');

    expect(state.buffer).toEqual(['new new', 'keep', 'new']);
    expect(state.dirty).toBe(true);
    expect(state.history).toContainEqual({ type: 'ex', command: ':%s/old/new/g' });
  });

  it('should keep state unchanged for malformed substitute syntax', () => {
    const initial = createState(['old old']);
    const state = runEx(initial, '%s/old/new');

    expect(state.buffer).toEqual(initial.buffer);
    expect(state.dirty).toBe(false);
    expect(state.status).toBe('E492: Not an editor command: :%s/old/new');
  });

  it('should replace only the first match on the current line with :s/old/new/', () => {
    const initial = { ...createState(['old old', 'old old']), cursor: { line: 0, col: 0 } };
    const state = runEx(initial, 's/old/new/');

    expect(state.buffer).toEqual(['new old', 'old old']);
    expect(state.dirty).toBe(true);
    expect(state.history).toContainEqual({ type: 'ex', command: ':s/old/new/' });
  });

  it('should replace every match on the current line with :s/old/new/g', () => {
    const initial = { ...createState(['old old', 'old']), cursor: { line: 0, col: 0 } };
    const state = runEx(initial, 's/old/new/g');

    expect(state.buffer).toEqual(['new new', 'old']);
  });

  it('should act on the cursor line, not the first line, for :s', () => {
    const initial = { ...createState(['old', 'old old']), cursor: { line: 1, col: 0 } };
    const state = runEx(initial, 's/old/new/g');

    expect(state.buffer).toEqual(['old', 'new new']);
  });

  it('should replace the first match on every line with :%s/old/new/', () => {
    const state = runEx(createState(['old old', 'old old']), '%s/old/new/');

    expect(state.buffer).toEqual(['new old', 'new old']);
    expect(state.history).toContainEqual({ type: 'ex', command: ':%s/old/new/' });
  });

  it('should report E486 when :s finds no match on the current line', () => {
    const state = runEx(createState(['nothing here']), 's/old/new/');

    expect(state.status).toBe('E486: Pattern not found: old');
  });

  it('should match case-insensitively with the i flag', () => {
    const state = runEx(createState(['Hello hello HELLO']), '%s/hello/hi/gi');

    expect(state.buffer).toEqual(['hi hi hi']);
    expect(state.history).toContainEqual({ type: 'ex', command: ':%s/hello/hi/gi' });
  });

  it('should replace only the first case-insensitive match without g', () => {
    const state = runEx(createState(['Hello hello']), '%s/hello/hi/i');

    expect(state.buffer).toEqual(['hi hello']);
  });

  it('should match case-insensitively with :s (line range) with the i flag', () => {
    const initial = { ...createState(['hello since world']), cursor: { line: 0, col: 0 } };
    const state = runEx(initial, 's/Since/Since/gi');

    expect(state.buffer).toEqual(['hello Since world']);
    expect(state.status).not.toMatch(/E486/);
    expect(state.history).toContainEqual({ type: 'ex', command: ':s/Since/Since/gi' });
  });

  it('should not report Pattern not found when :s matches but replacement equals the match', () => {
    // :s/Since/Since/gi on a line that already contains "Since" — the pattern IS found
    // but the replacement produces the same text. The engine must not report E486.
    const initial = { ...createState(['Since the Kleene star']), cursor: { line: 0, col: 0 } };
    const state = runEx(initial, 's/Since/Since/gi');

    expect(state.status).not.toMatch(/E486/);
    expect(state.history).toContainEqual({ type: 'ex', command: ':s/Since/Since/gi' });
    expect(state.dirty).toBe(false);
  });

  it('should still report E486 for :s when the pattern truly has no match', () => {
    const state = runEx(createState(['nothing here']), 's/Since/Since/gi');

    expect(state.status).toBe('E486: Pattern not found: Since');
  });

  it('should reject duplicate flags like gg', () => {
    const state = runEx(createState(['old']), '%s/old/new/gg');

    expect(state.status).toBe('E492: Not an editor command: :%s/old/new/gg');
  });

  it('should count every match without changing the buffer for :%s//gn', () => {
    const initial = createState(['old old', 'keep', 'old']);
    const state = runEx(initial, '%s/old//gn');

    expect(state.buffer).toEqual(['old old', 'keep', 'old']);
    expect(state.dirty).toBe(false);
    expect(state.status).toBe('3 matches on 2 lines');
    expect(state.history).toContainEqual({ type: 'ex', command: ':%s/old//gn' });
  });

  it('should count one match per line without the g flag for :%s//n', () => {
    const state = runEx(createState(['old old', 'old']), '%s/old//n');

    expect(state.buffer).toEqual(['old old', 'old']);
    expect(state.status).toBe('2 matches on 2 lines');
  });

  it('should count only the cursor line for :s//n', () => {
    const state = runEx(createState(['old old', 'old']), 's/old//gn');

    expect(state.status).toBe('2 matches on 1 line');
  });

  it('should report E486 for a count query that finds nothing, still recording it', () => {
    const state = runEx(createState(['keep']), '%s/gone//gn');

    expect(state.status).toBe('E486: Pattern not found: gone');
    expect(state.history).toContainEqual({ type: 'ex', command: ':%s/gone//gn' });
  });

  it('should treat bare * as a literal asterisk in :%s/*//gn', () => {
    const state = runEx(createState(['hello * world', 'no asterisk']), '%s/*//gn');

    expect(state.buffer).toEqual(['hello * world', 'no asterisk']);
    expect(state.status).toBe('1 match on 1 line');
  });

  it('should replace literal * characters with :%s/*/!/g', () => {
    const state = runEx(createState(['a * b * c']), '%s/*/!/g');

    expect(state.buffer).toEqual(['a ! b ! c']);
  });

  it('should not treat :set as a substitute command', () => {
    const state = runEx(createState(['one']), 'set number');

    expect(state.showLineNumbers).toBe(true);
    expect(state.status).toBe('');
  });

  it('should mark a buffer-changing substitution as a non-attempt', () => {
    const keys = [':', ...'%s/old/new/g'.split(''), 'Enter'];
    let state: EditorState = createState(['old old']);
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

  it('should not mark a failed substitution (pattern not found) as a non-attempt', () => {
    const keys = [':', ...'s/missing/new/'.split(''), 'Enter'];
    let state: EditorState = createState(['nothing here']);
    let lastActions: ReturnType<typeof dispatch>['actions'] = [];
    for (const key of keys) {
      const step = dispatch(state, key);
      state = step.state;
      lastActions = step.actions;
    }
    const exAction = lastActions.find((a) => a.command !== undefined);
    expect(exAction).toBeDefined();
    expect(actionAttempts.has(exAction!)).toBe(false);
  });

  it('should make substitution undoable with u', () => {
    const substituted = runEx(createState(['old old']), '%s/old/new/g');
    const undone = dispatch(substituted, 'u').state;

    expect(substituted.buffer).toEqual(['new new']);
    expect(undone.buffer).toEqual(['old old']);
  });

  it('should clear undo history on :e so u never restores one file into another', () => {
    const seed = createState([''], {
      activeFilePath: 'a.md',
      files: { 'a.md': ['alpha'], 'b.md': ['beta'] },
    });
    const edited = dispatch(seed, 'x').state;
    expect(edited.undoStack.length).toBeGreaterThan(0);

    const switched = runEx(edited, 'w');
    const opened = runEx(switched, 'e b.md');
    expect(opened.activeFilePath).toBe('b.md');
    expect(opened.undoStack).toHaveLength(0);

    const undone = dispatch(opened, 'u').state;
    expect(undone.buffer).toEqual(['beta']);
  });

  it('should show line numbers on :set number without touching the buffer', () => {
    const initial = createState(['one', 'two']);
    const state = runEx(initial, 'set number');

    expect(state.showLineNumbers).toBe(true);
    expect(state.buffer).toEqual(initial.buffer);
    expect(state.dirty).toBe(false);
    expect(state.status).toBe('');
    expect(state.mode).toBe('normal');
    expect(state.history).toContainEqual({ type: 'ex', command: ':set number' });
  });

  it('should start with line numbers hidden', () => {
    expect(createState(['one']).showLineNumbers).toBe(false);
  });

  it('should accept the :set nu abbreviation and record it as typed', () => {
    const state = runEx(createState(['one']), 'set nu');

    expect(state.showLineNumbers).toBe(true);
    expect(state.history).toContainEqual({ type: 'ex', command: ':set nu' });
  });

  it('should hide line numbers again on :set nonumber', () => {
    const shown = runEx(createState(['one']), 'set number');
    const hidden = runEx(shown, 'set nonumber');

    expect(hidden.showLineNumbers).toBe(false);
    expect(hidden.history).toContainEqual({ type: 'ex', command: ':set nonumber' });
  });

  it('should flip the setting on :set number!', () => {
    const shown = runEx(createState(['one']), 'set number!');
    const hidden = runEx(shown, 'set number!');

    expect(shown.showLineNumbers).toBe(true);
    expect(hidden.showLineNumbers).toBe(false);
  });

  it('should record a toggle as typed, not as the state it produced', () => {
    const state = runEx(createState(['one']), 'set number!');

    expect(state.history).toContainEqual({ type: 'ex', command: ':set number!' });
    expect(state.history).not.toContainEqual({ type: 'ex', command: ':set number' });
  });

  it('should keep line numbers on across :e into another file', () => {
    const seeded = createState([''], { files: { 'a.txt': ['a'], 'b.txt': ['b'] } });
    const state = runEx(runEx(seeded, 'set number'), 'e b.txt');

    expect(state.activeFilePath).toBe('b.txt');
    expect(state.showLineNumbers).toBe(true);
  });

  it('should report E518 for an option it does not simulate', () => {
    const state = runEx(createState(['one']), 'set wrap');

    expect(state.showLineNumbers).toBe(false);
    expect(state.status).toBe('E518: Unknown option: wrap');
  });

  it('should ask for an argument on a bare :set', () => {
    const state = runEx(createState(['one']), 'set');

    expect(state.status).toBe('E471: Argument required');
  });

  it('should leave the setting alone on u, since it is not buffer content', () => {
    const edited = dispatch(runEx(createState(['one']), 'set number'), 'x').state;
    const undone = dispatch(edited, 'u').state;

    expect(undone.buffer).toEqual(['one']);
    expect(undone.showLineNumbers).toBe(true);
  });
});
