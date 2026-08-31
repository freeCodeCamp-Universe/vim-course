import type { CommandResult } from './registry';
import { setMode } from './state';
import type { EditorState } from './types';
import { runExCommand } from './commands/ex';
import { runSearch } from './commands/search';
import { textLength, textSlice } from './text';

const ESCAPE_KEYS = new Set(['Escape', 'Esc', 'Ctrl-c']);
const ENTER_KEYS = new Set(['Enter', 'Return']);

function commandLineCursor(state: EditorState): number {
  return Math.min(
    textLength(state.commandLine),
    Math.max(0, state.commandLineCursor ?? textLength(state.commandLine))
  );
}

export function leaveCommandLine(state: EditorState): EditorState {
  return {
    ...setMode(state, 'normal'),
    commandLine: '',
    commandLineCursor: 0,
    commandLinePrompt: ':',
    commandLineRegisterPending: false,
  };
}

/**
 * Process one key while in `:` command-line mode. Printable keys edit the
 * command buffer, `Backspace` deletes one char, `Enter` executes, and `Esc`
 * cancels and returns to normal mode.
 */
export function processCommandLineKey(state: EditorState, key: string): CommandResult {
  // While waiting for a register name after Ctrl-r: the next key selects which
  // register to paste from. `"` is the unnamed register (Vim standard). Only
  // named register keys paste; anything unrecognized cancels the selection.
  // Escape/Ctrl-c cancel the command line entirely.
  if (state.commandLineRegisterPending) {
    if (ESCAPE_KEYS.has(key)) {
      return {
        state: leaveCommandLine(state),
        actions: [{ type: 'mode', command: 'Escape' }],
      };
    }
    if (key === '"') {
      const register = state.register;
      const text =
        register && register.text.length > 0
          ? register.linewise
            ? register.text.replace(/\n$/, '')
            : register.text
          : '';
      const cursor = commandLineCursor(state);
      return {
        state: {
          ...state,
          commandLine:
            textSlice(state.commandLine, 0, cursor) + text + textSlice(state.commandLine, cursor),
          commandLineCursor: cursor + textLength(text),
          commandLineRegisterPending: false,
        },
        actions: [{ type: 'command-line', command: 'Ctrl-r' }],
      };
    }
    // Any other key cancels the register selection without pasting or executing.
    return {
      state: { ...state, commandLineRegisterPending: false },
      actions: [],
    };
  }

  if (ESCAPE_KEYS.has(key)) {
    return {
      state: leaveCommandLine(state),
      actions: [{ type: 'mode', command: 'Escape' }],
    };
  }

  if (ENTER_KEYS.has(key)) {
    const executed =
      state.commandLinePrompt === '/'
        ? runSearch(state, state.commandLine)
        : runExCommand(state, state.commandLine);
    // Most ex commands leave the mode untouched (still `command-line`), so we
    // return to normal. An ex command that intentionally transitions the mode
    // (`:Explore` → explorer) keeps its mode; only the command buffer is cleared.
    const next =
      executed.state.mode === 'command-line'
        ? leaveCommandLine(executed.state)
        : {
            ...executed.state,
            commandLine: '',
            commandLineCursor: 0,
            commandLinePrompt: ':' as const,
            commandLineRegisterPending: false,
          };
    return { ...executed, state: next };
  }

  if (key === 'ArrowLeft') {
    const cursor = commandLineCursor(state);
    return {
      state: {
        ...state,
        commandLineCursor: Math.max(0, cursor - 1),
      },
      actions: [],
    };
  }

  if (key === 'ArrowRight') {
    const cursor = commandLineCursor(state);
    return {
      state: {
        ...state,
        commandLineCursor: Math.min(textLength(state.commandLine), cursor + 1),
      },
      actions: [],
    };
  }

  if (key === 'Backspace') {
    const cursor = commandLineCursor(state);
    if (cursor > 0) {
      return {
        state: {
          ...state,
          commandLine:
            textSlice(state.commandLine, 0, cursor - 1) + textSlice(state.commandLine, cursor),
          commandLineCursor: cursor - 1,
        },
        actions: [],
      };
    }
    return {
      state: state.commandLine.length === 0 ? leaveCommandLine(state) : state,
      actions: [],
    };
  }

  if (key === 'Delete') {
    const cursor = commandLineCursor(state);
    if (cursor >= textLength(state.commandLine)) {
      return { state, actions: [] };
    }
    return {
      state: {
        ...state,
        commandLine:
          textSlice(state.commandLine, 0, cursor) + textSlice(state.commandLine, cursor + 1),
      },
      actions: [],
    };
  }

  if (key === 'Ctrl-r') {
    return {
      state: { ...state, commandLineRegisterPending: true },
      actions: [],
    };
  }

  if (key.length === 1) {
    const cursor = commandLineCursor(state);
    return {
      state: {
        ...state,
        commandLine:
          textSlice(state.commandLine, 0, cursor) + key + textSlice(state.commandLine, cursor),
        commandLineCursor: cursor + textLength(key),
      },
      actions: [],
    };
  }

  return { state, actions: [] };
}
