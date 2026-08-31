import { describe, expect, it } from 'vitest';

import { dispatch } from './dispatch';
import { enterShell, pasteShellText, SHELL_PROMPT, splashText } from './shell';
import { createState } from './state';
import type { EditorState } from './types';

function run(state: EditorState, keys: string[]): EditorState {
  return keys.reduce((current, key) => dispatch(current, key).state, state);
}

function runEx(state: EditorState, commandBody: string): EditorState {
  return run(state, [':', ...commandBody.split(''), 'Enter']);
}

function typeShell(state: EditorState, command: string): EditorState {
  return run(state, [...command.split(''), 'Enter']);
}

describe('quit-to-shell and vim reopen', () => {
  it('should drop to the shell with a prompt on :q of a clean buffer', () => {
    const state = runEx(createState(['clean']), 'q');

    expect(state.mode).toBe('shell');
    expect(state.shell).toEqual(expect.objectContaining({ input: '' }));
    expect(state.buffer).toEqual([SHELL_PROMPT]);
  });

  it('should not reach the shell when :q is blocked by unsaved changes', () => {
    const state = runEx({ ...createState(['edited']), dirty: true }, 'q');

    expect(state.mode).not.toBe('shell');
    expect(state.shell).toBeNull();
    expect(state.status).toBe('E37: No write since last change');
  });

  it('should show the splash on bare vim after :wq, not reopen the file', () => {
    const edited = run(createState(['first']), ['A', ...' more', 'Escape']);
    const shell = runEx(edited, 'wq');
    const reopened = typeShell(shell, 'vim');

    expect(shell.mode).toBe('shell');
    expect(reopened.mode).toBe('normal');
    expect(reopened.splashVisible).toBe(true);
    expect(reopened.activeFilePath).toBe('');
  });

  it('should reopen with saved edits after :wq then vim <filename>', () => {
    const edited = run(createState(['first']), ['A', ...' more', 'Escape']);
    const shell = runEx(edited, 'wq');
    const reopened = typeShell(shell, 'vim current.txt');

    expect(shell.mode).toBe('shell');
    expect(reopened.mode).toBe('normal');
    expect(reopened.buffer).toEqual(['first more']);
    expect(reopened.dirty).toBe(false);
    expect(reopened.shell).toBeNull();
  });

  it('should honor the seeded cursor when vim opens a file from the shell', () => {
    // A shell-start lesson seeds a cursor mid-file; `enterShell` preserves it, and
    // the learner cannot move it at the prompt, so `vim <file>` should land there
    // rather than snapping to the top-left corner.
    const seeded = { ...createState(['one', 'two', 'three']), cursor: { line: 2, col: 0 } };
    const shell = enterShell(seeded);
    const reopened = typeShell(shell, 'vim current.txt');

    expect(reopened.mode).toBe('normal');
    expect(reopened.cursor).toEqual({ line: 2, col: 0 });
  });

  it('should discard unsaved edits after :q! then vim <filename>', () => {
    const edited = run(createState(['first']), ['A', ...' more', 'Escape']);
    const shell = runEx(edited, 'q!');
    const reopened = typeShell(shell, 'vim current.txt');

    expect(shell.mode).toBe('shell');
    expect(reopened.mode).toBe('normal');
    expect(reopened.buffer).toEqual(['first']);
    expect(reopened.dirty).toBe(false);
  });

  it('should record the reopen in action history', () => {
    const typed = run(runEx(createState(['clean']), 'q'), ['v', 'i', 'm']);
    const submit = dispatch(typed, 'Enter');

    expect(submit.actions).toContainEqual({ type: 'mode', command: 'vim' });
    expect(submit.state.history).toContainEqual({ type: 'mode', command: 'vim' });
  });

  it('should open a named file with vim <filename>', () => {
    const seeded = createState([''], {
      files: { 'notes.md': ['first note'], 'todo.md': ['first task'] },
      activeFilePath: 'notes.md',
    });
    const shell = runEx(seeded, 'q');
    const opened = typeShell(shell, 'vim todo.md');

    expect(opened.mode).toBe('normal');
    expect(opened.activeFilePath).toBe('todo.md');
    expect(opened.buffer).toEqual(['first task']);
  });

  it('should record the full command so a lesson can require the filename', () => {
    const seeded = createState([''], {
      files: { 'notes.md': ['a note'] },
      activeFilePath: 'notes.md',
    });
    const typed = run(runEx(seeded, 'q'), [...'vim notes.md']);
    const submit = dispatch(typed, 'Enter');

    expect(submit.actions).toContainEqual({ type: 'mode', command: 'vim notes.md' });
  });

  it('should open a new empty buffer when vim is given an unknown filename', () => {
    const seeded = createState([''], {
      files: { 'notes.md': ['a note'] },
      activeFilePath: 'notes.md',
    });
    const shell = runEx(seeded, 'q');
    const after = typeShell(shell, 'vim missing.md');

    expect(after.mode).toBe('normal');
    expect(after.activeFilePath).toBe('missing.md');
    expect(after.buffer).toEqual(['']);
    expect(after.status).toBe('"missing.md" [New]');
  });

  it('should refuse any shell command other than vim, the way a shell does', () => {
    const shell = runEx(createState(['clean']), 'q');
    const after = typeShell(shell, 'ls -la');

    expect(after.mode).toBe('shell');
    expect(after.shell?.input).toBe('');
    expect(after.buffer).toEqual([SHELL_PROMPT]);
    expect(after.shell?.output).toEqual(['$ ls -la', 'command not found: ls']);
  });

  it('should clear input on Ctrl-c and append the interrupted line to output', () => {
    const shell = runEx(createState(['clean']), 'q');
    const typed = run(shell, [...'ls -la']);
    const after = dispatch(typed, 'Ctrl-c').state;

    expect(after.mode).toBe('shell');
    expect(after.shell?.input).toBe('');
    expect(after.shell?.output).toEqual(['$ ls -la^C']);
  });

  it('should append an empty ^C line when Ctrl-c is pressed with no input', () => {
    const shell = runEx(createState(['clean']), 'q');
    const after = dispatch(shell, 'Ctrl-c').state;

    expect(after.shell?.input).toBe('');
    expect(after.shell?.output).toEqual(['$ ^C']);
  });

  describe('shell scrollback', () => {
    it('should accumulate the submitted prompt and rejection message in output', () => {
      const after = typeShell(runEx(createState(['hello']), 'q'), 'foo');

      expect(after.shell?.output).toEqual(['$ foo', 'command not found: foo']);
      expect(after.shell?.input).toBe('');
    });

    it('should accumulate multiple rejected commands', () => {
      const shell = runEx(createState(['hello']), 'q');
      const after1 = typeShell(shell, 'ls');
      const after2 = typeShell(after1, 'cat file');

      expect(after2.shell?.output).toEqual([
        '$ ls',
        'command not found: ls',
        '$ cat file',
        'command not found: cat',
      ]);
    });

    it('should not add output on empty Enter', () => {
      const after = run(runEx(createState(['hello']), 'q'), ['Enter']);

      expect(after.shell?.output).toEqual([]);
    });

    it('should open a new buffer for an unknown filename rather than rejecting', () => {
      const after = typeShell(runEx(createState(['hello']), 'q'), 'vim nonexistent.txt');

      expect(after.mode).toBe('normal');
      expect(after.activeFilePath).toBe('nonexistent.txt');
      expect(after.shell).toBeNull();
    });

    it('should clear output on reset via re-entering shell from seed', () => {
      const after = typeShell(runEx(createState(['hello']), 'q'), 'foo');
      expect(after.shell?.output.length).toBeGreaterThan(0);

      const reseeded = enterShell(createState(['hello']));
      expect(reseeded.shell?.output).toEqual([]);
    });
  });

  it('should say nothing when Enter is pressed at an empty prompt', () => {
    const shell = runEx(createState(['clean']), 'q');
    const after = run(shell, ['Enter']);

    expect(after.status).toBe('');
  });

  it('should build up and backspace the typed shell command', () => {
    const shell = runEx(createState(['clean']), 'q');
    const typed = run(shell, ['v', 'i', 'x']);

    expect(typed.shell?.input).toBe('vix');
    expect(typed.buffer).toEqual([`${SHELL_PROMPT}vix`]);

    const corrected = run(typed, ['Backspace']);
    expect(corrected.shell?.input).toBe('vi');
  });
});

describe('shell cursor movement', () => {
  it('should move the cursor left and right within the input', () => {
    const shell = runEx(createState(['clean']), 'q');
    const typed = run(shell, ['a', 'b', 'c']);

    expect(typed.shell?.cursorPos).toBe(3);

    const left1 = run(typed, ['ArrowLeft']);
    expect(left1.shell?.cursorPos).toBe(2);

    const left2 = run(left1, ['ArrowLeft']);
    expect(left2.shell?.cursorPos).toBe(1);

    const right1 = run(left2, ['ArrowRight']);
    expect(right1.shell?.cursorPos).toBe(2);
  });

  it('should clamp ArrowLeft at position 0', () => {
    const shell = runEx(createState(['clean']), 'q');
    const typed = run(shell, ['a']);
    const left = run(typed, ['ArrowLeft', 'ArrowLeft', 'ArrowLeft']);

    expect(left.shell?.cursorPos).toBe(0);
  });

  it('should clamp ArrowRight at the end of input', () => {
    const shell = runEx(createState(['clean']), 'q');
    const typed = run(shell, ['a', 'b']);
    const right = run(typed, ['ArrowRight', 'ArrowRight']);

    expect(right.shell?.cursorPos).toBe(2);
  });

  it('should insert a character at the cursor position', () => {
    const shell = runEx(createState(['clean']), 'q');
    const typed = run(shell, ['a', 'c', 'ArrowLeft', 'b']);

    expect(typed.shell?.input).toBe('abc');
    expect(typed.shell?.cursorPos).toBe(2);
  });

  it('should delete the character before the cursor on Backspace', () => {
    const shell = runEx(createState(['clean']), 'q');
    const typed = run(shell, ['a', 'b', 'c', 'ArrowLeft', 'Backspace']);

    expect(typed.shell?.input).toBe('ac');
    expect(typed.shell?.cursorPos).toBe(1);
  });

  it('should not delete on Backspace when the cursor is at position 0', () => {
    const shell = runEx(createState(['clean']), 'q');
    const typed = run(shell, ['a', 'Home', 'Backspace']);

    expect(typed.shell?.input).toBe('a');
    expect(typed.shell?.cursorPos).toBe(0);
  });

  it('should delete the character after the cursor on Delete', () => {
    const shell = runEx(createState(['clean']), 'q');
    const typed = run(shell, ['a', 'b', 'c', 'Home', 'Delete']);

    expect(typed.shell?.input).toBe('bc');
    expect(typed.shell?.cursorPos).toBe(0);
  });

  it('should not delete on Delete when the cursor is at the end', () => {
    const shell = runEx(createState(['clean']), 'q');
    const typed = run(shell, ['a', 'Delete']);

    expect(typed.shell?.input).toBe('a');
    expect(typed.shell?.cursorPos).toBe(1);
  });

  it('should jump to start on Home and to end on End', () => {
    const shell = runEx(createState(['clean']), 'q');
    const typed = run(shell, ['a', 'b', 'c']);

    const home = run(typed, ['Home']);
    expect(home.shell?.cursorPos).toBe(0);

    const end = run(home, ['End']);
    expect(end.shell?.cursorPos).toBe(3);
  });

  it('should reset cursorPos to 0 after Enter submits and clears input', () => {
    const shell = runEx(createState(['clean']), 'q');
    const typed = run(shell, ['f', 'o', 'o', 'Enter']);

    expect(typed.shell?.input).toBe('');
    expect(typed.shell?.cursorPos).toBe(0);
  });
});

describe('shell word-jump', () => {
  it('should jump to the previous word boundary with Alt-ArrowLeft', () => {
    const shell = runEx(createState(['clean']), 'q');
    const typed = run(shell, [...'vim notes.md']);

    expect(typed.shell?.cursorPos).toBe(12);

    const jump1 = run(typed, ['Alt-ArrowLeft']);
    expect(jump1.shell?.cursorPos).toBe(10);

    const jump2 = run(jump1, ['Alt-ArrowLeft']);
    expect(jump2.shell?.cursorPos).toBe(4);

    const jump3 = run(jump2, ['Alt-ArrowLeft']);
    expect(jump3.shell?.cursorPos).toBe(0);
  });

  it('should jump to the next word boundary with Alt-ArrowRight', () => {
    const shell = runEx(createState(['clean']), 'q');
    const typed = run(shell, [...'vim notes.md', 'Home']);

    expect(typed.shell?.cursorPos).toBe(0);

    const jump1 = run(typed, ['Alt-ArrowRight']);
    expect(jump1.shell?.cursorPos).toBe(4);

    const jump2 = run(jump1, ['Alt-ArrowRight']);
    expect(jump2.shell?.cursorPos).toBe(10);

    const jump3 = run(jump2, ['Alt-ArrowRight']);
    expect(jump3.shell?.cursorPos).toBe(12);
  });

  it('should support Ctrl-ArrowLeft and Ctrl-ArrowRight as word-jump aliases', () => {
    const shell = runEx(createState(['clean']), 'q');
    const typed = run(shell, [...'hello world']);

    const left = run(typed, ['Ctrl-ArrowLeft']);
    expect(left.shell?.cursorPos).toBe(6);

    const right = run(left, ['Ctrl-ArrowRight']);
    expect(right.shell?.cursorPos).toBe(11);
  });

  it('should clamp at boundaries on repeated word-jumps', () => {
    const shell = runEx(createState(['clean']), 'q');
    const typed = run(shell, [...'ab']);

    const left = run(typed, ['Alt-ArrowLeft', 'Alt-ArrowLeft', 'Alt-ArrowLeft']);
    expect(left.shell?.cursorPos).toBe(0);

    const right = run(left, ['Alt-ArrowRight', 'Alt-ArrowRight', 'Alt-ArrowRight']);
    expect(right.shell?.cursorPos).toBe(2);
  });

  it('should delete the previous word with Alt-Backspace', () => {
    const shell = runEx(createState(['clean']), 'q');
    const typed = run(shell, [...'vim notes.md']);

    const after = run(typed, ['Alt-Backspace']);
    expect(after.shell?.input).toBe('vim notes.');
    expect(after.shell?.cursorPos).toBe(10);

    // The second word-delete skips the `.` (non-word) then `notes` (word),
    // removing both together — matching macOS Option+Backspace behavior.
    const after2 = run(after, ['Alt-Backspace']);
    expect(after2.shell?.input).toBe('vim ');
    expect(after2.shell?.cursorPos).toBe(4);
  });

  it('should delete the previous word with Ctrl-Backspace', () => {
    const shell = runEx(createState(['clean']), 'q');
    const typed = run(shell, [...'hello world']);

    const after = run(typed, ['Ctrl-Backspace']);
    expect(after.shell?.input).toBe('hello ');
    expect(after.shell?.cursorPos).toBe(6);
  });

  it('should not delete on word-backspace when the cursor is at position 0', () => {
    const shell = runEx(createState(['clean']), 'q');
    const typed = run(shell, ['a', 'Home']);

    const after = run(typed, ['Alt-Backspace']);
    expect(after.shell?.input).toBe('a');
    expect(after.shell?.cursorPos).toBe(0);
  });

  it('should word-delete from a mid-input cursor position', () => {
    const shell = runEx(createState(['clean']), 'q');
    // Type "one two three", move cursor to after "two "
    const typed = run(shell, [...'one two three', 'Alt-ArrowLeft']);

    expect(typed.shell?.cursorPos).toBe(8);

    const after = run(typed, ['Alt-Backspace']);
    expect(after.shell?.input).toBe('one three');
    expect(after.shell?.cursorPos).toBe(4);
  });
});

describe('startup splash', () => {
  it('should show the splash on bare vim from any shell', () => {
    const shell = runEx(createState(['clean']), 'q');
    const opened = typeShell(shell, 'vim');

    expect(opened.mode).toBe('normal');
    expect(opened.splashVisible).toBe(true);
    expect(opened.buffer).toEqual(['']);
    expect(opened.activeFilePath).toBe('');
  });

  it('should record the splash entry in action history like any other reopen', () => {
    const shell = runEx(createState(['clean']), 'q');
    const typed = run(shell, ['v', 'i', 'm']);
    const submit = dispatch(typed, 'Enter');

    expect(submit.actions).toContainEqual({ type: 'mode', command: 'vim' });
    expect(submit.state.history).toContainEqual({ type: 'mode', command: 'vim' });
  });

  it('should not show the splash on vim <filename>', () => {
    const seeded = createState([''], {
      files: { 'notes.md': ['a note'] },
      activeFilePath: 'notes.md',
    });
    const shell = runEx(seeded, 'q');
    const opened = typeShell(shell, 'vim notes.md');

    expect(opened.mode).toBe('normal');
    expect(opened.splashVisible).toBe(false);
    expect(opened.activeFilePath).toBe('notes.md');
  });

  it('should show the splash on bare vim after :q, :q!, and :wq', () => {
    for (const cmd of ['q', 'q!', 'wq']) {
      const shell = runEx(createState(['clean']), cmd);
      const opened = typeShell(shell, 'vim');

      expect(opened.splashVisible).toBe(true);
      expect(opened.activeFilePath).toBe('');
    }
  });

  it('should exit to the shell on :q<Enter>', () => {
    const shell = enterShell(createState(['clean']));
    const splash = typeShell(shell, 'vim');
    const exited = runEx(splash, 'q');

    expect(exited.mode).toBe('shell');
    expect(exited.splashVisible).toBe(false);
    expect(exited.shell).toEqual(expect.objectContaining({ input: '' }));
  });

  it('should show the splash again on a bare vim once no file is associated', () => {
    const shell = enterShell(createState(['clean']));
    const exited = runEx(typeShell(shell, 'vim'), 'q');
    const relaunched = typeShell(exited, 'vim');

    expect(relaunched.splashVisible).toBe(true);
    expect(relaunched.activeFilePath).toBe('');
  });

  it('should open a seeded file with :e from the splash, clearing the filler', () => {
    const seeded = createState([''], {
      files: { 'notes.md': ['a note'] },
      activeFilePath: 'notes.md',
    });
    const splash = typeShell(enterShell(seeded), 'vim');
    const opened = runEx(splash, 'e notes.md');

    expect(opened.mode).toBe('normal');
    expect(opened.splashVisible).toBe(false);
    expect(opened.activeFilePath).toBe('notes.md');
    expect(opened.buffer).toEqual(['a note']);
    expect(opened.history).toContainEqual({ type: 'ex', command: ':e notes.md' });
  });

  it('should keep the splash through a cancelled command line', () => {
    const splash = typeShell(enterShell(createState(['clean'])), 'vim');
    const cancelled = run(splash, [':', 'Escape']);

    expect(cancelled.mode).toBe('normal');
    expect(cancelled.splashVisible).toBe(true);
  });

  it('should clear the splash once the buffer is edited', () => {
    const splash = typeShell(enterShell(createState(['clean'])), 'vim');
    const typedIn = run(splash, ['i', 'h', 'i', 'Escape']);

    expect(typedIn.splashVisible).toBe(false);
    expect(typedIn.buffer).toEqual(['hi']);
  });

  it('should refuse to write the unnamed buffer with E32', () => {
    const splash = typeShell(enterShell(createState(['clean'])), 'vim');

    expect(runEx(splash, 'w').status).toBe('E32: No file name');
    expect(runEx(splash, 'wq').status).toBe('E32: No file name');
    expect(runEx(splash, 'w').mode).toBe('normal');
  });

  it('should report an unknown command from the splash the way Vim does anywhere else', () => {
    const splash = typeShell(enterShell(createState(['clean'])), 'vim');
    const after = runEx(splash, 'help');

    expect(after.splashVisible).toBe(true);
    expect(after.status).toBe('E492: Not an editor command: :help');
  });

  it('should render the splash text over the buffer rather than storing it as content', () => {
    const splash = typeShell(enterShell(createState(['clean'])), 'vim');

    expect(splash.buffer).not.toEqual(splashText(80));
    expect(splashText(80)[0]).toContain('VIM - Vi IMproved');
  });

  it('should show the splash on bare vim after quitting a file that was never written', () => {
    const shell = enterShell(createState(['clean']));
    const splash = typeShell(shell, 'vim');
    const opened = runEx(splash, 'e newfile.txt');
    const quit = runEx(opened, 'q');
    const relaunched = typeShell(quit, 'vim');

    expect(relaunched.splashVisible).toBe(true);
    expect(relaunched.activeFilePath).toBe('');
  });

  it('should show the splash on bare vim even after :wq of a written file', () => {
    const shell = enterShell(createState(['clean']));
    const splash = typeShell(shell, 'vim');
    const opened = runEx(splash, 'e newfile.txt');
    const written = runEx(opened, 'wq');
    const relaunched = typeShell(written, 'vim');

    expect(relaunched.splashVisible).toBe(true);
    expect(relaunched.activeFilePath).toBe('');
  });
});

describe('pasteShellText', () => {
  it('should insert text at the cursor position', () => {
    const shell = runEx(createState(['clean']), 'q');
    const typed = run(shell, [...'abc']);

    const pasted = pasteShellText(typed, 'XY');

    expect(pasted.shell?.input).toBe('abcXY');
    expect(pasted.shell?.cursorPos).toBe(5);
  });

  it('should insert text at a mid-input cursor position', () => {
    const shell = runEx(createState(['clean']), 'q');
    const typed = run(shell, [...'abc', 'Home', 'ArrowRight']);

    const pasted = pasteShellText(typed, 'XY');

    expect(pasted.shell?.input).toBe('aXYbc');
    expect(pasted.shell?.cursorPos).toBe(3);
  });

  it('should collapse newlines to spaces', () => {
    const shell = runEx(createState(['clean']), 'q');

    const pasted = pasteShellText(shell, 'one\ntwo\nthree');

    expect(pasted.shell?.input).toBe('one two three');
    expect(pasted.shell?.cursorPos).toBe(13);
  });

  it('should be a no-op when shell state is null', () => {
    const state = createState(['hello']);
    expect(state.shell).toBeNull();

    const result = pasteShellText(state, 'text');

    expect(result).toBe(state);
  });

  it('should update the buffer and cursor to reflect the shell display', () => {
    const shell = runEx(createState(['clean']), 'q');

    const pasted = pasteShellText(shell, 'vim');

    expect(pasted.buffer).toEqual([`${SHELL_PROMPT}vim`]);
    expect(pasted.cursor.col).toBe(SHELL_PROMPT.length + 3);
  });
});
