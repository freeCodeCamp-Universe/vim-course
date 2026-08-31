import { describe, expect, it } from 'vitest';

import { dispatch, dispatchPaste, type AllowedCommands } from './dispatch';
import { createRegistry, type CommandContext } from './registry';
import { createState, setMode } from './state';

/** A trivial command: writes its resolved count into the status line. */
function trivialRegistry() {
  const registry = createRegistry();
  registry.register('a', ({ state, count }: CommandContext) => ({
    state: { ...state, status: `a:${count ?? 0}` },
    actions: [{ type: 'edit', command: 'a', ...(count !== null ? { count } : {}) }],
  }));
  registry.register('b', ({ state }: CommandContext) => ({
    state: { ...state, mode: 'insert' },
    actions: [{ type: 'mode', command: 'b' }],
  }));
  return registry;
}

describe('dispatch', () => {
  it('should run a handler and append its action to history', () => {
    const registry = trivialRegistry();
    const { state, actions } = dispatch(createState(['hi']), 'a', { registry });

    expect(state.status).toBe('a:0');
    expect(actions).toEqual([{ type: 'edit', command: 'a' }]);
    expect(state.history).toEqual([{ type: 'edit', command: 'a' }]);
  });

  it('should report an unknown command key as unsupported', () => {
    const registry = trivialRegistry();
    const initial = createState(['hi']);
    const { state, actions } = dispatch(initial, 'Z', { registry });

    expect(state.status).toBe('Z is not supported in this lesson');
    expect(state.buffer).toEqual(initial.buffer);
    expect(state.cursor).toEqual(initial.cursor);
    expect(actions).toEqual([]);
  });

  it('should clear an error when the next key starts a new command', () => {
    const registry = trivialRegistry();
    const afterError = dispatch(createState(['hi']), 'Z', { registry }).state;

    const afterCommand = dispatch(afterError, 'a', { registry }).state;
    expect(afterCommand.status).toBe('a:0');
    expect(afterCommand.statusIsError).toBe(false);

    const commandLine = dispatch(afterError, ':').state;
    expect(commandLine.mode).toBe('command-line');
    expect(commandLine.status).toBe('');
    expect(commandLine.statusIsError).toBe(false);
  });

  it('should clear a non-error status when the next key starts a new command', () => {
    const withStatus = {
      ...createState(['hi']),
      status: '"newfile.txt" [New]',
      statusIsError: false,
    };

    const commandLine = dispatch(withStatus, ':').state;
    expect(commandLine.mode).toBe('command-line');
    expect(commandLine.status).toBe('');
  });

  it('should stay silent for a hardware key with no command behind it', () => {
    const registry = trivialRegistry();
    const initial = createState(['hi']);
    const { state, actions } = dispatch(initial, 'Shift', { registry });

    expect(state).toBe(initial);
    expect(actions).toEqual([]);
  });

  it('should accumulate digit keys into the pending count', () => {
    const registry = trivialRegistry();
    const afterOne = dispatch(createState(['hi']), '1', { registry });
    const afterTwo = dispatch(afterOne.state, '2', { registry });

    expect(afterTwo.state.pendingCount).toBe('12');
    expect(afterTwo.actions).toEqual([]);
  });

  it('should pass the resolved count to the handler and reset it after', () => {
    const registry = trivialRegistry();
    const counted = dispatch(dispatch(createState(['hi']), '3', { registry }).state, 'a', {
      registry,
    });

    expect(counted.state.status).toBe('a:3');
    expect(counted.actions).toEqual([{ type: 'edit', command: 'a', count: 3 }]);
    expect(counted.state.pendingCount).toBe('');
  });

  it('should reset pending operator and count after a command completes', () => {
    const registry = trivialRegistry();
    const primed = { ...createState(['hi']), pendingOperator: 'd', pendingCount: '2' };
    const { state } = dispatch(primed, 'a', { registry });

    expect(state.pendingOperator).toBeNull();
    expect(state.pendingCount).toBe('');
  });

  it('should reset pending operator and count on Escape', () => {
    const primed = { ...createState(['hi']), pendingOperator: 'd', pendingCount: '2' };
    const { state, actions } = dispatch(primed, 'Escape');

    expect(state.pendingOperator).toBeNull();
    expect(state.pendingCount).toBe('');
    expect(actions).toEqual([]);
  });

  describe('with allowedCommands (workshop mode)', () => {
    it('should change no buffer/cursor/mode state and record only a filtered action', () => {
      const registry = trivialRegistry();
      const initial = createState(['hi']);
      const { state, actions } = dispatch(initial, 'b', {
        registry,
        allowedCommands: (command) => (command === 'a' ? true : {}),
      });

      expect(state.buffer).toEqual(initial.buffer);
      expect(state.cursor).toEqual(initial.cursor);
      expect(state.mode).toBe('normal');
      expect(state.status).toBe('b is not supported in this lesson');
      expect(state.statusIsError).toBe(true);
      expect(actions).toEqual([{ type: 'filtered', command: 'b' }]);
      expect(state.history).toEqual([{ type: 'filtered', command: 'b' }]);
    });

    it('should run allowed commands normally', () => {
      const registry = trivialRegistry();
      const { state } = dispatch(createState(['hi']), 'a', {
        registry,
        allowedCommands: (command) => (command === 'a' ? true : {}),
      });

      expect(state.status).toBe('a:0');
    });

    it('should move the cursor with arrow keys even when they are not an allowed command', () => {
      const initial = createState(['hello']);
      const { state, actions } = dispatch(initial, 'ArrowRight', {
        allowedCommands: (command) => (command === 'a' ? true : {}),
      });

      expect(state.cursor).toEqual({ line: 0, col: 1 });
      expect(actions).toEqual([{ type: 'motion', command: 'ArrowRight' }]);
    });

    it('should block an arrow key when the filter returns a deny reason', () => {
      const initial = createState(['hello']);
      const { state, actions } = dispatch(initial, 'ArrowRight', {
        allowedCommands: (command) => (command === 'ArrowRight' ? { reason: 'deny' } : true),
      });

      expect(state.cursor).toEqual(initial.cursor);
      expect(actions).toEqual([{ type: 'filtered', command: 'ArrowRight' }]);
    });

    it('should block an arrow key when the filter returns a limit reason', () => {
      const initial = createState(['hello']);
      const { state, actions } = dispatch(initial, 'ArrowDown', {
        allowedCommands: () => ({ reason: 'limit', message: 'limit reached' }),
      });

      expect(state.cursor).toEqual(initial.cursor);
      expect(actions).toEqual([{ type: 'filtered', command: 'ArrowDown' }]);
      expect(state.status).toBe('limit reached');
    });

    it('should let an arrow key through when the filter returns an allow reason', () => {
      const initial = createState(['hello']);
      const { state, actions } = dispatch(initial, 'ArrowRight', {
        allowedCommands: () => ({ reason: 'allow' }),
      });

      expect(state.cursor).toEqual({ line: 0, col: 1 });
      expect(actions).toEqual([{ type: 'motion', command: 'ArrowRight' }]);
    });

    it('should block an arrow key in insert mode when the filter returns a deny reason', () => {
      const normal = createState(['hello']);
      // Enter insert mode first, then try an arrow key.
      const { state: inserted } = dispatch(normal, 'i');
      expect(inserted.mode).toBe('insert');
      const { state, actions } = dispatch(inserted, 'ArrowRight', {
        allowedCommands: (command) => (command === 'ArrowRight' ? { reason: 'deny' } : true),
      });

      expect(state.cursor).toEqual(inserted.cursor);
      expect(actions).toEqual([{ type: 'filtered', command: 'ArrowRight' }]);
    });
  });

  describe('filtering the resolved command, not the leading key', () => {
    // Only `x` is permitted, so a multi-key `dd` sharing the `d` prefix must be
    // filtered on completion, not the moment `d` is pressed.
    const onlyX = (command: string) => (command === 'x' ? true : {});

    it('should let a pending operator build without filtering its leading key', () => {
      const { state, actions } = dispatch(createState(['hello', 'world']), 'd', {
        allowedCommands: onlyX,
      });

      expect(state.pendingOperator).toBe('d');
      expect(actions).toEqual([]);
    });

    it('should filter the completed multi-key command and leave the buffer untouched', () => {
      const initial = createState(['hello', 'world']);
      const pending = dispatch(initial, 'd', { allowedCommands: onlyX }).state;
      const { state, actions } = dispatch(pending, 'd', { allowedCommands: onlyX });

      expect(actions).toEqual([{ type: 'filtered', command: 'dd' }]);
      expect(state.buffer).toEqual(initial.buffer);
      expect(state.pendingOperator).toBeNull();
    });

    it('should still run a permitted single-key command', () => {
      const { state } = dispatch(createState(['hello']), 'x', { allowedCommands: onlyX });

      expect(state.buffer).toEqual(['ello']);
    });
  });

  describe('filtering commands typed on the command line', () => {
    // Everything is allowed except `:q`.
    const noQuit = (command: string) => (command !== ':q' ? true : {});

    it('should permit entering command-line mode even when the command will be refused', () => {
      const { state, actions } = dispatch(createState(['hello']), ':', { allowedCommands: noQuit });

      expect(state.mode).toBe('command-line');
      expect(actions.some((action) => action.type === 'filtered')).toBe(false);
    });

    it('should filter the refused command on execution and return to normal mode', () => {
      let state = createState(['hello']);
      for (const key of [':', 'q']) {
        state = dispatch(state, key, { allowedCommands: noQuit }).state;
      }
      const { state: after, actions } = dispatch(state, 'Enter', { allowedCommands: noQuit });

      expect(actions).toEqual([{ type: 'filtered', command: ':q' }]);
      expect(after.mode).toBe('normal');
    });
  });

  describe('usage-cap plumbing (count, history, and messages)', () => {
    it('should hand the filter the resolved count and the history from before the command', () => {
      const registry = trivialRegistry();
      const seen: Array<{ command: string; count: number; priorLength: number }> = [];
      const allowedCommands: AllowedCommands = (command, count, history) => {
        seen.push({ command, count, priorLength: history.length });
        return true;
      };

      // `3a` resolves to command `a` with count 3; no action exists yet when it runs.
      let state = createState(['x']);
      for (const key of ['3', 'a']) {
        state = dispatch(state, key, { registry, allowedCommands }).state;
      }

      expect(seen).toEqual([{ command: 'a', count: 3, priorLength: 0 }]);
    });

    it('should write a cap rejection message to the status line and mutate nothing else', () => {
      const registry = trivialRegistry();
      const initial = createState(['hello']);
      const allowedCommands: AllowedCommands = () => ({ message: 'limit reached: a' });

      const { state, actions } = dispatch(initial, 'a', { registry, allowedCommands });

      expect(state.status).toBe('limit reached: a');
      expect(state.statusIsError).toBe(true);
      expect(state.buffer).toEqual(initial.buffer);
      expect(actions).toEqual([{ type: 'filtered', command: 'a' }]);
    });

    it('should report an allow or deny rejection on the status line', () => {
      const registry = trivialRegistry();
      const { state } = dispatch(createState(['hello']), 'a', {
        registry,
        allowedCommands: () => ({}),
      });

      expect(state.status).toBe('a is not supported in this lesson');
      expect(state.statusIsError).toBe(true);
    });
  });

  describe('terrain veto', () => {
    function terrainRules(): Map<string, ReadonlySet<string>> {
      return new Map([
        ['#', new Set<string>()],
        ['~', new Set(['0', '$'])],
        ['%', new Set(['w', 'b'])],
      ]);
    }

    function terrainState(lines: string[]) {
      const state = createState(lines);
      return { ...state, terrain: terrainRules() };
    }

    it('should leave buffer, cursor, and mode identical when a key is blocked', () => {
      const initial = terrainState(['.#.']);
      const { state, actions } = dispatch(initial, 'l');

      expect(state.cursor).toEqual(initial.cursor);
      expect(state.buffer).toEqual(initial.buffer);
      expect(state.mode).toBe(initial.mode);
      expect(actions).toEqual([{ type: 'blocked', command: 'l' }]);
    });

    it('should append exactly one blocked action and no motion action', () => {
      const initial = terrainState(['.#.']);
      const { actions } = dispatch(initial, 'l');

      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('blocked');
      expect(actions.some((a) => a.type === 'motion')).toBe(false);
    });

    it('should set a non-empty status when blocked', () => {
      const initial = terrainState(['.#.']);
      const { state } = dispatch(initial, 'l');

      expect(state.status).not.toBe('');
      expect(state.status).toContain('wall');
    });

    it('should clear status on the next successful motion', () => {
      const initial = terrainState(['.#..']);
      // First: try to move into wall → blocked with status
      const { state: blocked } = dispatch(initial, 'l');
      expect(blocked.status).not.toBe('');

      // Move cursor to col 2 (past the wall) manually, then move right
      const atCol2 = { ...blocked, cursor: { line: 0, col: 2 } };
      const { state: moved } = dispatch(atCol2, 'l');
      expect(moved.status).toBe('');
    });

    it('should not interfere with dispatch when terrain is null', () => {
      const initial = createState(['.#.']);
      expect(initial.terrain).toBeNull();

      const { state, actions } = dispatch(initial, 'l');
      expect(state.cursor.col).toBe(1);
      expect(actions.some((a) => a.type === 'motion')).toBe(true);
    });

    it('should allow $ across water', () => {
      const initial = terrainState(['.~~~.']);
      const { state, actions } = dispatch(initial, '$');

      expect(state.cursor.col).toBe(4);
      expect(actions.some((a) => a.type === 'motion')).toBe(true);
    });

    it('should refuse l across water', () => {
      const initial = terrainState(['.~~~.']);
      const { state } = dispatch(initial, 'l');

      expect(state.cursor.col).toBe(0);
    });
  });
});

describe('dispatchPaste', () => {
  it('should insert text in insert mode and leave cursor at the end', () => {
    const initial = setMode(createState(['hello']), 'insert');
    const { state } = dispatchPaste(initial, 'XY');

    expect(state.buffer).toEqual(['XYhello']);
    expect(state.cursor).toEqual({ line: 0, col: 2 });
    expect(state.mode).toBe('insert');
  });

  it('should handle multi-line paste in insert mode', () => {
    const initial = setMode({ ...createState(['abcd']), cursor: { line: 0, col: 2 } }, 'insert');
    const { state } = dispatchPaste(initial, 'X\nY');

    expect(state.buffer).toEqual(['abX', 'Ycd']);
    expect(state.cursor).toEqual({ line: 1, col: 1 });
    expect(state.mode).toBe('insert');
  });

  it('should insert text in normal mode and return to normal mode', () => {
    const initial = createState(['hello']);
    const { state } = dispatchPaste(initial, 'XY');

    expect(state.buffer).toEqual(['XYhello']);
    expect(state.mode).toBe('normal');
    // Cursor should be on the last pasted character (col 1, the 'Y')
    expect(state.cursor).toEqual({ line: 0, col: 1 });
  });

  it('should mark the buffer dirty after pasting', () => {
    const initial = createState(['hello']);
    expect(initial.dirty).toBe(false);

    const { state } = dispatchPaste(initial, 'X');
    expect(state.dirty).toBe(true);
  });

  it('should be a no-op for empty text', () => {
    const initial = createState(['hello']);
    const { state } = dispatchPaste(initial, '');

    expect(state).toBe(initial);
  });

  it('should normalize CRLF line endings', () => {
    const initial = setMode(createState(['ab']), 'insert');
    const { state } = dispatchPaste(initial, 'X\r\nY');

    expect(state.buffer).toEqual(['X', 'Yab']);
  });

  it('should paste into the command line', () => {
    const initial = {
      ...createState(['hello']),
      mode: 'command-line' as const,
      commandLine: 'w',
      commandLineCursor: 1,
    };
    const { state } = dispatchPaste(initial, 'q');

    expect(state.commandLine).toBe('wq');
    expect(state.commandLineCursor).toBe(2);
  });

  it('should record an undo snapshot for buffer paste', () => {
    const initial = createState(['hello']);
    expect(initial.undoStack).toHaveLength(0);

    const { state } = dispatchPaste(initial, 'X');
    expect(state.undoStack.length).toBeGreaterThan(0);
  });
});
