import { describe, expect, it } from 'vitest';
import type { Action, EditorState } from '@/engine';
import { orderedLessonIds } from './lessonOrder';
import { getLessonById } from './loader';
import type { AuthoredLessonDefinition } from './types';
import { vimLessonEngine, type AllowedInput } from './lessonEngine';

/** Feed a run of keys through the engine, threading the state. */
function feedKeys(state: EditorState, keys: readonly string[]): EditorState {
  return keys.reduce((current, key) => vimLessonEngine.feed(current, key).state, state);
}

/** Whether a lesson's filter runs a command (verdict `true`), as the engine reads it. */
function ran(
  filter: AllowedInput | undefined,
  command: string,
  count = 1,
  history: readonly Action[] = []
): boolean {
  return filter?.(command, count, history) === true;
}

const workshop: AuthoredLessonDefinition = {
  id: 'w1',
  module: 1,
  lesson: 1,
  title: 'Insert mode',
  instructions: 'enter insert mode',
  type: 'learn',
  files: { 'greeting.txt': 'hello\nworld' },
  config: {
    start: 'file',
    open: 'greeting.txt',
    cursor: [2, 3],
    allowedCommands: ['i', 'Esc'],
    checklist: [{ label: 'Enter insert mode', test: { command: 'i' } }],
  },
};

const lab: AuthoredLessonDefinition = {
  id: 'l1',
  module: 8,
  lesson: 1,
  title: 'Edit the file',
  instructions: 'make the change',
  type: 'practice',
  files: { 'a.txt': 'foo' },
  config: {
    start: 'file',
    open: 'a.txt',
    cursor: [1, 1],
    checklist: [{ label: 'done', test: { file: 'a.txt', equals: 'bar' } }],
  },
};

describe('vimLessonEngine', () => {
  it('should seed the active file buffer and convert the 1-based cursor', () => {
    const state = vimLessonEngine.seed(workshop);

    expect(state.buffer).toEqual(['hello', 'world']);
    expect(state.activeFilePath).toBe('greeting.txt');
    expect(state.cursor).toEqual({ line: 1, col: 2 });
    expect(state.mode).toBe('normal');
  });

  it('should use a configured message template for unsupported commands', () => {
    const lesson: AuthoredLessonDefinition = {
      ...workshop,
      config: {
        ...workshop.config,
        allowedCommands: undefined,
        unsupportedMessage: '{sequence} is not supported in this world',
      },
    };

    const unknown = vimLessonEngine.feed(vimLessonEngine.seed(lesson), 'Z').state;
    expect(unknown.status).toBe('Z is not supported in this world');

    const visual = vimLessonEngine.feed(vimLessonEngine.seed(lesson), 'v').state;
    const modeError = vimLessonEngine.feed(visual, 'p').state;
    expect(modeError.status).toBe('p is not supported in this world');

    const modeTemplateLesson: AuthoredLessonDefinition = {
      ...lesson,
      config: {
        ...lesson.config,
        unsupportedMessage: '{sequence} is unavailable in {mode}',
      },
    };
    const modeTemplateVisual = vimLessonEngine.feed(
      vimLessonEngine.seed(modeTemplateLesson),
      'v'
    ).state;
    const modeTemplateError = vimLessonEngine.feed(modeTemplateVisual, 'p').state;
    expect(modeTemplateError.status).toBe('p is unavailable in visual mode');
  });

  it('should start in the explorer when the lesson opens on a listing', () => {
    const explore: AuthoredLessonDefinition = {
      ...workshop,
      files: { 'a.txt': 'a', 'b.txt': 'b' },
      config: { ...workshop.config, start: 'explore', open: 'a.txt' },
    };

    const state = vimLessonEngine.seed(explore);

    expect(state.mode).toBe('explorer');
    expect(state.explorer?.entries).toEqual(['a.txt', 'b.txt']);
  });

  it('should start in the shell when the lesson opens on a prompt', () => {
    const shell: AuthoredLessonDefinition = {
      ...workshop,
      config: { ...workshop.config, start: 'shell' },
    };

    expect(vimLessonEngine.seed(shell).mode).toBe('shell');
  });

  it('should preserve config.cursor through a cold-start shell into the opened file', () => {
    const shell: AuthoredLessonDefinition = {
      ...workshop,
      files: { 'notes.txt': 'line one\nline two\nline three\nline four\nline five' },
      config: {
        ...workshop.config,
        start: 'shell',
        open: '',
        cursor: [3, 5],
        allowedCommands: ['vim'],
        checklist: [{ label: 'Open the file.', test: { command: 'vim notes.txt' } }],
      },
    };

    const seeded = vimLessonEngine.seed(shell);
    expect(seeded.mode).toBe('shell');

    const opened = feedKeys(seeded, [...'vim notes.txt', 'Enter']);

    expect(opened.activeFilePath).toBe('notes.txt');
    // 1-based [3, 5] → 0-based { line: 2, col: 4 }
    expect(opened.cursor).toEqual({ line: 2, col: 4 });
  });

  it('should clamp an out-of-bounds config.cursor to the file when opened from a shell', () => {
    const shell: AuthoredLessonDefinition = {
      ...workshop,
      files: { 'short.txt': 'ab\ncd' },
      config: {
        ...workshop.config,
        start: 'shell',
        open: '',
        cursor: [10, 20],
        allowedCommands: ['vim'],
        checklist: [{ label: 'Open the file.', test: { command: 'vim short.txt' } }],
      },
    };

    const opened = feedKeys(vimLessonEngine.seed(shell), [...'vim short.txt', 'Enter']);

    // Clamped to last line (1), last col (1) of a 2-line, 2-char-per-line buffer.
    expect(opened.cursor).toEqual({ line: 1, col: 1 });
  });

  it('should start on the splash screen when the lesson opens with Vim launched and no file', () => {
    const splash: AuthoredLessonDefinition = {
      ...workshop,
      config: { ...workshop.config, start: 'splash' },
    };

    const state = vimLessonEngine.seed(splash);

    expect(state.mode).toBe('normal');
    expect(state.splashVisible).toBe(true);
    expect(state.shell).toBeNull();
    expect(state.activeFilePath).toBe('');
  });

  it('should open a seeded file with :e from a splash-start lesson', () => {
    const splash: AuthoredLessonDefinition = {
      ...workshop,
      config: { ...workshop.config, start: 'splash', allowedCommands: [':e'] },
    };

    const state = feedKeys(vimLessonEngine.seed(splash), [':', ...'e greeting.txt', 'Enter']);

    expect(state.splashVisible).toBe(false);
    expect(state.activeFilePath).toBe('greeting.txt');
    expect(state.buffer).toEqual(['hello', 'world']);
  });

  it('should quit from a splash-start lesson back to the shell', () => {
    const splash: AuthoredLessonDefinition = {
      ...workshop,
      config: { ...workshop.config, start: 'splash' },
    };

    let state = feedKeys(vimLessonEngine.seed(splash), [':', 'q', 'Enter']);
    expect(state.mode).toBe('shell');

    // No file was ever opened, so a bare `vim` launches onto the splash again.
    state = feedKeys(state, [...'vim', 'Enter']);
    expect(state.splashVisible).toBe(true);
  });

  // The shape module 03's first lesson uses: launch Vim with a bare `vim`, land
  // on the splash, then open the file from there with `:e`.
  it('should complete a shell-start lesson whose task runs :e from the splash', () => {
    const launchThenOpen: AuthoredLessonDefinition = {
      ...workshop,
      config: {
        ...workshop.config,
        start: 'shell',
        allowedCommands: ['vim', ':e'],
        checklist: [
          { label: 'Start Vim.', test: { command: 'vim' } },
          { label: 'Open the file.', test: { command: ':e greeting.txt' } },
        ],
      },
    };

    const launched = feedKeys(vimLessonEngine.seed(launchThenOpen), [...'vim', 'Enter']);
    expect(launched.splashVisible).toBe(true);

    const opened = feedKeys(launched, [':', ...'e greeting.txt', 'Enter']);

    expect(opened.activeFilePath).toBe('greeting.txt');
    expect(vimLessonEngine.checkRequirements(opened, launchThenOpen).every((r) => r.passed)).toBe(
      true
    );
  });

  it('should permit a taught command and its argument form, but not a longer verb', () => {
    const opener: AuthoredLessonDefinition = {
      ...workshop,
      config: { ...workshop.config, allowedCommands: [':e'] },
    };

    const allowed = vimLessonEngine.allowedInput(opener);

    // The filter judges the resolved command, not the leading key: `:e` and its
    // argument form pass; `:w` (a different verb sharing the `:`) does not.
    expect(ran(allowed, ':e')).toBe(true);
    expect(ran(allowed, ':e greeting.txt')).toBe(true);
    expect(ran(allowed, ':w')).toBe(false);
    expect(ran(allowed, 'x')).toBe(false);
  });

  it('should treat a bare `:` or `/` entry as a family wildcard', () => {
    const anyEx: AuthoredLessonDefinition = {
      ...workshop,
      config: { ...workshop.config, allowedCommands: [':', '/'] },
    };

    const allowed = vimLessonEngine.allowedInput(anyEx);

    expect(ran(allowed, ':w')).toBe(true);
    expect(ran(allowed, ':wq')).toBe(true);
    expect(ran(allowed, '/foo')).toBe(true);
    expect(ran(allowed, 'x')).toBe(false);
  });

  it('should forbid only the named command with disallowedCommands', () => {
    const noQuit: AuthoredLessonDefinition = {
      ...workshop,
      config: { ...workshop.config, allowedCommands: undefined, disallowedCommands: [':q'] },
    };

    const allowed = vimLessonEngine.allowedInput(noQuit);

    // Everything runs except the one forbidden verb; sibling `:`-commands are untouched.
    expect(ran(allowed, ':q')).toBe(false);
    expect(ran(allowed, ':w')).toBe(true);
    expect(ran(allowed, ':wq')).toBe(true);
    expect(ran(allowed, 'x')).toBe(true);
  });

  it('should subtract the deny list from the allow list when both are set', () => {
    const both: AuthoredLessonDefinition = {
      ...workshop,
      config: { ...workshop.config, allowedCommands: [':', 'x'], disallowedCommands: [':q'] },
    };

    const allowed = vimLessonEngine.allowedInput(both);

    expect(ran(allowed, ':w')).toBe(true);
    expect(ran(allowed, ':q')).toBe(false);
    expect(ran(allowed, 'x')).toBe(true);
    expect(ran(allowed, 'dd')).toBe(false);
  });

  it('should not filter input for a lab', () => {
    expect(vimLessonEngine.allowedInput(lab)).toBeUndefined();
  });

  describe('command usage caps', () => {
    const capped = (limits: NonNullable<AuthoredLessonDefinition['config']['commandLimits']>) => ({
      ...workshop,
      config: { ...workshop.config, allowedCommands: undefined, commandLimits: limits },
    });

    /** A history of `n` successful invocations of `command`. */
    const uses = (command: string, n: number): Action[] =>
      Array.from({ length: n }, () => ({ type: 'edit', command }));

    it('should cap invocations with the number shorthand and message on the over-cap use', () => {
      const allowed = vimLessonEngine.allowedInput(capped({ x: 2 }));

      expect(ran(allowed, 'x', 1, uses('x', 0))).toBe(true);
      expect(ran(allowed, 'x', 1, uses('x', 1))).toBe(true);
      expect(allowed?.('x', 1, uses('x', 2))).toMatchObject({
        message: expect.stringContaining('limit reached'),
      });
    });

    it('should read the object form times knob the same as the shorthand', () => {
      const allowed = vimLessonEngine.allowedInput(capped({ x: { times: 1 } }));

      expect(ran(allowed, 'x', 1, uses('x', 0))).toBe(true);
      expect(allowed?.('x', 1, uses('x', 1))).toMatchObject({ message: expect.any(String) });
    });

    it('should cap the count prefix with maxCount but allow an at-or-under count', () => {
      const allowed = vimLessonEngine.allowedInput(capped({ dd: { maxCount: 1 } }));

      expect(ran(allowed, 'dd', 1, [])).toBe(true);
      expect(allowed?.('dd', 2, [])).toMatchObject({
        message: expect.stringContaining('count too high'),
      });
    });

    it('should not count a prior filtered action toward the invocation cap', () => {
      const allowed = vimLessonEngine.allowedInput(capped({ x: 1 }));

      // A refusal records `{ type: 'filtered', command: 'x' }`; it must not spend a use.
      expect(ran(allowed, 'x', 1, [{ type: 'filtered', command: 'x' }])).toBe(true);
    });

    it('should block the over-cap press through feed, surfacing the message and an attempt', () => {
      const lesson = capped({ x: 2 });
      const allowed = vimLessonEngine.allowedInput(lesson);

      const first = vimLessonEngine.feed(vimLessonEngine.seed(lesson), 'x', allowed);
      const second = vimLessonEngine.feed(first.state, 'x', allowed);
      const third = vimLessonEngine.feed(second.state, 'x', allowed);

      // Two deletions land; the third press is refused with a message and counts as an attempt.
      expect(first.state.status).toBe('');
      expect(third.state.status).toContain('limit reached');
      expect(third.state.statusIsError).toBe(true);
      expect(third.attempted).toBe(true);
      expect(third.state.buffer).toEqual(second.state.buffer);
    });

    it('should cap only the substituting :%s form when the key is a /pattern/flags regex', () => {
      const key = '/^:%s\\/.*\\/.*\\/(?!.*n)[gi]*$/';
      const allowed = vimLessonEngine.allowedInput(capped({ [key]: 3 }));

      const subs = (n: number): Action[] =>
        Array.from({ length: n }, () => ({ type: 'ex' as const, command: ':%s/a/b/g' }));
      const query: Action = { type: 'ex', command: ':%s/a//gn' };

      // The count query never matches the key, so any number of prior ones leave the cap intact.
      expect(ran(allowed, ':%s/a//gn', 1, [query, query, query])).toBe(true);
      // Substitutions do count against it: two run, the third is refused.
      expect(ran(allowed, ':%s/a/b/g', 1, subs(2))).toBe(true);
      expect(allowed?.(':%s/a/b/g', 1, subs(3))).toMatchObject({
        message: 'limit reached: :%s/old/new/g may be used 3 times',
      });
    });

    it('should layer a cap on top of the allow list, denying silently but capping with a message', () => {
      const lesson: AuthoredLessonDefinition = {
        ...workshop,
        config: { ...workshop.config, allowedCommands: ['x'], commandLimits: { x: 1 } },
      };
      const allowed = vimLessonEngine.allowedInput(lesson);

      expect(ran(allowed, 'x', 1, [])).toBe(true);
      // Not in the allow list: rejected silently with an 'allow' reason.
      expect(allowed?.('dd', 1, [])).toEqual({ reason: 'allow' });
      // Allowed but over its cap: rejected with a message.
      expect(allowed?.('x', 1, uses('x', 1))).toMatchObject({ message: expect.any(String) });
    });
  });

  it('should advance the state through feed', () => {
    const seeded = vimLessonEngine.seed(lab);

    const inserted = vimLessonEngine.feed(seeded, 'i');

    expect(inserted.state.mode).toBe('insert');
  });

  it('should announce a mode change, a completed edit, and stay silent on a motion', () => {
    const seeded = vimLessonEngine.seed(lab);

    expect(vimLessonEngine.feed(seeded, 'i').announcement).toBe('insert mode');
    expect(vimLessonEngine.feed(seeded, 'x').announcement).toBe('character deleted');
    expect(vimLessonEngine.feed(seeded, 'l').announcement).toBe('');
  });

  it('should announce what an operator did to a selection rather than the mode it returns to', () => {
    const entered = vimLessonEngine.feed(vimLessonEngine.seed(lab), 'v');
    expect(entered.announcement).toBe('visual mode');

    const selected = vimLessonEngine.feed(entered.state, 'l').state;

    expect(vimLessonEngine.feed(selected, 'd').announcement).toBe('selection deleted');
    expect(vimLessonEngine.feed(selected, 'y').announcement).toBe('selection yanked');
  });

  it('should announce insert mode when a selection is changed, since that is where it lands', () => {
    const selected = ['v', 'l'].reduce(
      (state, key) => vimLessonEngine.feed(state, key).state,
      vimLessonEngine.seed(lab)
    );

    expect(vimLessonEngine.feed(selected, 'c').announcement).toBe('insert mode');
  });

  it('should announce the line-number gutter rather than the mode it returns to', () => {
    let result = vimLessonEngine.feed(vimLessonEngine.seed(lab), ':');
    for (const key of [...'set number', 'Enter']) {
      result = vimLessonEngine.feed(result.state, key);
    }

    expect(result.state.showLineNumbers).toBe(true);
    expect(result.announcement).toBe('line numbers shown');
  });

  it('should announce the destination line text when the cursor moves vertically', () => {
    const multiLine: AuthoredLessonDefinition = {
      ...lab,
      files: { 'a.txt': 'first\nsecond\nthird' },
      config: { ...lab.config, open: 'a.txt', cursor: [1, 1] },
    };
    const seeded = vimLessonEngine.seed(multiLine);

    const afterJ = vimLessonEngine.feed(seeded, 'j');
    expect(afterJ.announcement).toBe('second');

    const afterJJ = vimLessonEngine.feed(afterJ.state, 'j');
    expect(afterJJ.announcement).toBe('third');
  });

  it('should announce "blank line" when moving to an empty line', () => {
    const withBlank: AuthoredLessonDefinition = {
      ...lab,
      files: { 'a.txt': 'first\n\nthird' },
      config: { ...lab.config, open: 'a.txt', cursor: [1, 1] },
    };
    const seeded = vimLessonEngine.seed(withBlank);

    expect(vimLessonEngine.feed(seeded, 'j').announcement).toBe('blank line');
  });

  it('should stay silent on a horizontal motion within the same line', () => {
    const seeded = vimLessonEngine.seed(lab);
    expect(vimLessonEngine.feed(seeded, 'l').announcement).toBe('');
  });

  it('should announce the E37 status when quitting a dirty buffer', () => {
    let result = vimLessonEngine.feed(vimLessonEngine.seed(lab), 'x');
    for (const key of [':', 'q', 'Enter']) {
      result = vimLessonEngine.feed(result.state, key);
    }

    expect(result.announcement).toContain('E37');
  });

  it('should filter disallowed input when feed is given a predicate', () => {
    const seeded = vimLessonEngine.seed(workshop);
    const allowed = vimLessonEngine.allowedInput(workshop);

    // `x` is not taught here (only `i`/`Esc`), so it is filtered to a no-op.
    const after = vimLessonEngine.feed(seeded, 'x', allowed);

    expect(after.state.buffer).toEqual(['hello', 'world']);
  });

  it('should report a workshop requirement complete once its command runs', () => {
    const seeded = vimLessonEngine.seed(workshop);

    expect(vimLessonEngine.checkRequirements(seeded, workshop)).toEqual([
      { passed: false, monotonic: true },
    ]);

    const inserted = vimLessonEngine.feed(seeded, 'i');

    expect(vimLessonEngine.checkRequirements(inserted.state, workshop)).toEqual([
      { passed: true, monotonic: true },
    ]);
  });

  it('should track a lab requirement live, failing pristine and passing once it matches', () => {
    let state = vimLessonEngine.seed(lab);
    expect(vimLessonEngine.checkRequirements(state, lab)).toEqual([
      { passed: false, monotonic: false },
    ]);

    // Change 'foo' to 'bar'.
    state = feedKeys(state, ['c', 'c', 'b', 'a', 'r', 'Escape']);

    expect(vimLessonEngine.checkRequirements(state, lab)).toEqual([
      { passed: true, monotonic: false },
    ]);
  });

  it('should read the file, not the shell display, once the learner quits Vim', () => {
    const quitLab: AuthoredLessonDefinition = {
      ...lab,
      config: {
        ...lab.config,
        checklist: [{ label: 'saved and quit', test: { equals: 'bar', saved: true, quit: true } }],
      },
    };

    let state = vimLessonEngine.seed(quitLab);
    state = feedKeys(state, ['c', 'c', 'b', 'a', 'r', 'Escape']);
    expect(vimLessonEngine.checkRequirements(state, quitLab)).toEqual([
      { passed: false, monotonic: false },
    ]);

    state = feedKeys(state, [':', 'w', 'q', 'Enter']);

    expect(state.mode).toBe('shell');
    expect(vimLessonEngine.checkRequirements(state, quitLab)).toEqual([
      { passed: true, monotonic: false },
    ]);
  });

  it('should fail a quit requirement again when the learner reopens Vim', () => {
    const quitLab: AuthoredLessonDefinition = {
      ...lab,
      config: { ...lab.config, checklist: [{ label: 'quit', test: { quit: true } }] },
    };

    let state = feedKeys(vimLessonEngine.seed(quitLab), [':', 'q', 'Enter']);
    expect(vimLessonEngine.checkRequirements(state, quitLab)).toEqual([
      { passed: true, monotonic: false },
    ]);

    state = feedKeys(state, [...'vim', 'Enter']);

    expect(vimLessonEngine.checkRequirements(state, quitLab)).toEqual([
      { passed: false, monotonic: false },
    ]);
  });

  it('should discard unsaved edits on :q!, so a content requirement fails again', () => {
    let state = vimLessonEngine.seed(lab);
    state = feedKeys(state, ['c', 'c', 'b', 'a', 'r', 'Escape']);
    expect(vimLessonEngine.checkRequirements(state, lab)).toEqual([
      { passed: true, monotonic: false },
    ]);

    state = feedKeys(state, [':', 'q', '!', 'Enter']);

    expect(vimLessonEngine.checkRequirements(state, lab)).toEqual([
      { passed: false, monotonic: false },
    ]);
  });

  it('should explain what is missing when a lesson is unfinished', () => {
    const seeded = vimLessonEngine.seed(lab);

    expect(vimLessonEngine.explainIncomplete(seeded, lab)).toContain("steps aren't done yet");
    expect(vimLessonEngine.explainIncomplete(vimLessonEngine.seed(workshop), workshop)).toContain(
      "steps aren't done yet"
    );
  });
});

describe('authored lessons end to end', () => {
  // Every authored lesson, played the way its own checklist says to. The point is
  // that the shipped content is finishable, not just that it parses.
  const authored = orderedLessonIds.map((id) => getLessonById(id) as AuthoredLessonDefinition);

  it('should show the splash screen from the shell prompt with bare vim', () => {
    const lesson = authored[0];
    let state = vimLessonEngine.seed(lesson);

    expect(state.mode).toBe('shell');
    state = feedKeys(state, [...'vim', 'Enter']);

    expect(state.mode).toBe('normal');
    expect(state.splashVisible).toBe(true);
    expect(vimLessonEngine.checkRequirements(state, lesson).every((result) => result.passed)).toBe(
      true
    );
  });

  it('should open a file with :e after launching vim', () => {
    const lesson = authored[1];
    let state = vimLessonEngine.seed(lesson);

    expect(state.mode).toBe('shell');
    state = feedKeys(state, [...'vim', 'Enter']);
    expect(state.splashVisible).toBe(true);
    state = feedKeys(state, [...':e about-vim.md', 'Enter']);

    expect(state.mode).toBe('normal');
    expect(state.activeFilePath).toBe('about-vim.md');
    expect(state.buffer[0]).toBe(
      'Vim was created by Bram Moolenaar and initially released in 1991. Its name originally stood for "Vi Imitation" before changing to "Vi IMproved".'
    );
    expect(vimLessonEngine.checkRequirements(state, lesson).every((result) => result.passed)).toBe(
      true
    );
  });

  it('should not pass all requirements with only the first step completed', () => {
    const lesson = authored[1];
    const state = feedKeys(vimLessonEngine.seed(lesson), [...'vim', 'Enter']);

    expect(vimLessonEngine.checkRequirements(state, lesson).every((result) => result.passed)).toBe(
      false
    );
  });

  it('should report a submitted shell command as an attempt and other keys as typing', () => {
    const lesson = authored[1];
    const seeded = vimLessonEngine.seed(lesson);

    expect(vimLessonEngine.feed(seeded, 'v').attempted).toBe(false);
    expect(vimLessonEngine.feed(seeded, 'Enter').attempted).toBe(true);
  });

  it('should not report a command marked as observational as an attempt', () => {
    const seeded = vimLessonEngine.seed(workshop);
    let state = vimLessonEngine.feed(seeded, ':').state;

    for (const key of '%s/foo//gn') {
      state = vimLessonEngine.feed(state, key).state;
    }

    expect(vimLessonEngine.feed(state, 'Enter').attempted).toBe(false);
  });

  it('should not report a matching count-only substitution as an attempt', () => {
    const seeded = vimLessonEngine.seed(workshop);
    let state = vimLessonEngine.feed(seeded, ':').state;

    for (const key of '%s/hello//gn') {
      state = vimLessonEngine.feed(state, key).state;
    }

    expect(vimLessonEngine.feed(state, 'Enter').attempted).toBe(false);
  });

  it('should not report Enter used to confirm a command-line register paste as an attempt', () => {
    let state = vimLessonEngine.seed(workshop);
    state = vimLessonEngine.feed(state, ':').state;
    state = {
      ...state,
      commandLineRegisterPending: true,
      register: { text: '§', linewise: false },
    };

    const result = vimLessonEngine.feed(state, 'Enter');

    expect(result.state.commandLine).toBe('§');
    expect(result.attempted).toBe(false);
  });
});

describe('terrain seeding', () => {
  const terrainLesson: AuthoredLessonDefinition = {
    id: 't1',
    module: 1,
    lesson: 1,
    title: 'Maze lesson',
    instructions: 'navigate the maze',
    type: 'learn',
    files: { 'maze.txt': '.#.\n...' },
    config: {
      start: 'file',
      open: 'maze.txt',
      cursor: [1, 1],
      allowedCommands: ['h', 'j', 'k', 'l', '0', '$', 'w', 'b'],
      terrain: [
        { glyph: '#', passableBy: [] },
        { glyph: '~', passableBy: ['0', '$'] },
      ],
      checklist: [{ label: 'Reach the end', test: { cursorAt: [1, 3] } }],
    },
  };

  const noTerrainLesson: AuthoredLessonDefinition = {
    ...terrainLesson,
    id: 't2',
    config: { ...terrainLesson.config, terrain: undefined },
  };

  it('should set non-null terrain on a lesson with terrain config', () => {
    const state = vimLessonEngine.seed(terrainLesson);
    expect(state.terrain).not.toBeNull();
    expect(state.terrain!.has('#')).toBe(true);
  });

  it('should set null terrain on a lesson without terrain config', () => {
    const state = vimLessonEngine.seed(noTerrainLesson);
    expect(state.terrain).toBeNull();
  });

  it('should report a blocked keystroke as attempted', () => {
    const state = vimLessonEngine.seed(terrainLesson);
    const filter = vimLessonEngine.allowedInput(terrainLesson);
    const result = vimLessonEngine.feed(state, 'l', filter);

    expect(result.attempted).toBe(true);
  });

  it('should announce the status message when blocked', () => {
    const state = vimLessonEngine.seed(terrainLesson);
    const filter = vimLessonEngine.allowedInput(terrainLesson);
    const result = vimLessonEngine.feed(state, 'l', filter);

    expect(result.announcement).not.toBe('');
    expect(result.announcement).toContain('wall');
  });
});
