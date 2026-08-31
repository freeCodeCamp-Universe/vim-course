import { describe, expect, it } from 'vitest';

import { dispatch } from './dispatch';
import { createState } from './state';

function run(keys: string[]) {
  return keys.reduce((state, key) => dispatch(state, key).state, createState(['hello']));
}

describe('command-line mode', () => {
  it('should enter command-line mode from normal with :', () => {
    const state = run([':']);

    expect(state.mode).toBe('command-line');
    expect(state.commandLine).toBe('');
    expect(state.history).toEqual([{ type: 'mode', command: ':' }]);
  });

  it('should capture typed keys and support Backspace editing', () => {
    const state = run([':', 'w', 'q', 'Backspace']);

    expect(state.mode).toBe('command-line');
    expect(state.commandLine).toBe('w');
    expect(state.commandLineCursor).toBe(1);
  });

  it('should move the cursor and insert text at the cursor position', () => {
    const state = run([':', 'e', ' ', 'o', 'o', 'ArrowLeft', 'ArrowLeft', 'f']);

    expect(state.commandLine).toBe('e foo');
    expect(state.commandLineCursor).toBe(3);
  });

  it('should delete the character before the cursor', () => {
    const state = run([':', 'e', ' ', 'f', 'o', 'o', 'ArrowLeft', 'Backspace']);

    expect(state.commandLine).toBe('e fo');
    expect(state.commandLineCursor).toBe(3);
  });

  it('should leave command-line mode when Backspace removes the prompt', () => {
    const state = run([':', 'Backspace']);

    expect(state.mode).toBe('normal');
    expect(state.commandLine).toBe('');
  });

  it('should cancel command-line mode on Escape', () => {
    const state = run([':', 'w', 'Escape']);

    expect(state.mode).toBe('normal');
    expect(state.commandLine).toBe('');
  });

  it('should cancel command-line mode on Ctrl-c', () => {
    const state = run([':', 'w', 'Ctrl-c']);

    expect(state.mode).toBe('normal');
    expect(state.commandLine).toBe('');
  });

  it('should execute on Enter and return to normal mode', () => {
    const dirty = { ...createState(['hello']), dirty: true };
    const state = [':', 'w', 'Enter'].reduce((s, key) => dispatch(s, key).state, dirty);

    expect(state.mode).toBe('normal');
    expect(state.commandLine).toBe('');
    expect(state.dirty).toBe(false);
  });

  it('should show the register-pending indicator after Ctrl-r, not paste immediately', () => {
    const state = {
      ...createState(['hello']),
      mode: 'command-line' as const,
      commandLine: ':%s/',
      commandLineCursor: 4,
      register: { text: '§', linewise: false },
    };

    const result = dispatch(state, 'Ctrl-r');

    expect(result.state.commandLineRegisterPending).toBe(true);
    expect(result.state.commandLine).toBe(':%s/');
    expect(result.actions).toEqual([]);
  });

  it('should paste a charwise register when " is pressed after Ctrl-r', () => {
    const state = {
      ...createState(['hello']),
      mode: 'command-line' as const,
      commandLine: ':%s/',
      commandLineCursor: 4,
      commandLineRegisterPending: true,
      register: { text: '§', linewise: false },
    };

    const result = dispatch(state, '"');

    expect(result.state.commandLine).toBe(':%s/§');
    expect(result.state.commandLineRegisterPending).toBe(false);
    expect(result.actions).toEqual([{ type: 'command-line', command: 'Ctrl-r' }]);
  });

  it('should cancel the register selection without pasting when Enter is pressed after Ctrl-r', () => {
    const state = {
      ...createState(['hello']),
      mode: 'command-line' as const,
      commandLine: ':%s/',
      commandLineCursor: 4,
      commandLineRegisterPending: true,
      register: { text: '§', linewise: false },
    };

    const result = dispatch(state, 'Enter');

    expect(result.state.commandLine).toBe(':%s/');
    expect(result.state.commandLineRegisterPending).toBe(false);
    expect(result.actions).toEqual([]);
  });

  it('should paste a linewise register without trailing newline after Ctrl-r then "', () => {
    const state = {
      ...createState(['hello']),
      mode: 'command-line' as const,
      commandLine: ':put ',
      commandLineCursor: 5,
      commandLineRegisterPending: true,
      register: { text: 'line\n', linewise: true },
    };

    const result = dispatch(state, '"');

    expect(result.state.commandLine).toBe(':put line');
    expect(result.state.commandLineRegisterPending).toBe(false);
  });

  it('should paste empty string when register is null after Ctrl-r then "', () => {
    const state = {
      ...createState(['hello']),
      mode: 'command-line' as const,
      commandLine: ':%s/',
      commandLineCursor: 4,
      commandLineRegisterPending: true,
    };

    const result = dispatch(state, '"');

    expect(result.state.commandLine).toBe(':%s/');
    expect(result.state.commandLineRegisterPending).toBe(false);
  });

  it('should cancel the register selection and leave command-line on Escape after Ctrl-r', () => {
    const state = {
      ...createState(['hello']),
      mode: 'command-line' as const,
      commandLine: ':%s/',
      commandLineCursor: 4,
      commandLineRegisterPending: true,
      register: { text: '§', linewise: false },
    };

    const result = dispatch(state, 'Escape');

    expect(result.state.mode).toBe('normal');
    expect(result.state.commandLineRegisterPending).toBe(false);
    expect(result.state.commandLine).toBe('');
  });

  it('should discard an unrecognized key while register is pending without pasting', () => {
    const state = {
      ...createState(['hello']),
      mode: 'command-line' as const,
      commandLine: ':%s/',
      commandLineCursor: 4,
      commandLineRegisterPending: true,
      register: { text: '§', linewise: false },
    };

    const result = dispatch(state, 'a');

    expect(result.state.commandLine).toBe(':%s/');
    expect(result.state.commandLineRegisterPending).toBe(false);
  });

  it('should insert the pasted text at the cursor position, not always at the end', () => {
    const state = {
      ...createState(['hello']),
      mode: 'command-line' as const,
      commandLine: '%s/bar',
      commandLineCursor: 3,
      commandLineRegisterPending: true,
      register: { text: 'foo', linewise: false },
    };

    const result = dispatch(state, '"');

    expect(result.state.commandLine).toBe('%s/foobar');
    expect(result.state.commandLineCursor).toBe(6);
    expect(result.state.commandLineRegisterPending).toBe(false);
  });
});
