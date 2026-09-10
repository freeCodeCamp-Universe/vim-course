import { clampCursor, normalizeBuffer } from './buffer';
import { getVirtualFile, newFileStatus, setVirtualFile } from './filesystem';
import type { CommandResult } from './registry';
import type { Buffer, Cursor, EditorState, ShellState } from './types';
import { centerText } from '@/terminal/centerText';

/** The shell prompt the typed command follows. */
export const SHELL_PROMPT = '$ ';

/**
 * A stand-in for Vim's real startup splash: drawn over the empty unnamed buffer
 * a bare `vim` opens, in place of the version/register/`:help` lines a real
 * install would print (this simulator doesn't support `:help`). It is filler,
 * not content — the buffer underneath is a single empty line, and the renderer
 * shows this instead while `splashVisible` holds.
 */
const SPLASH_CONTENT: string[] = [
  'VIM - Vi IMproved',
  'by Bram Moolenaar et al.',
  '',
  "This stands in for Vim's real startup screen.",
  '',
  'type  :q<Enter>        to exit',
];

export function splashText(cols: number, autoCenter = true): Buffer {
  if (!autoCenter) {
    return SPLASH_CONTENT.map((line) => (line === '' ? '~' : `~  ${line}`));
  }
  return SPLASH_CONTENT.map((line) => (line === '' ? '~' : '~' + centerText(line, cols - 1)));
}

const ENTER_KEYS = new Set(['Enter', 'Return']);
const REOPEN_COMMAND = 'vim';

/** The shell display: the prompt line with its typed input. */
function shellBuffer(shell: ShellState): Buffer {
  return [`${SHELL_PROMPT}${shell.input}`];
}

/** The cursor sits at `cursorPos` within the typed input on the prompt line. */
function shellCursor(shell: ShellState): Cursor {
  return { line: 0, col: SHELL_PROMPT.length + shell.cursorPos };
}

function withShell(state: EditorState, shell: ShellState): EditorState {
  return { ...state, shell, buffer: shellBuffer(shell), cursor: shellCursor(shell) };
}

/**
 * Drop from the editor into the simulated shell with an empty prompt. The
 * buffer is replaced with the shell display so a plain renderer shows the
 * prompt; `mode === 'shell'` is the signal that Vim has been quit.
 */
export function enterShell(state: EditorState, options: { openCursor?: Cursor } = {}): EditorState {
  return withShell(
    { ...state, mode: 'shell', splashVisible: false },
    {
      input: '',
      cursorPos: 0,
      output: [],
      // An explicit `openCursor` is passed by `seed()` for cold-start shells
      // whose active buffer is empty — `state.cursor` would already be clamped
      // to (0,0) by `moveCursor`, losing the lesson's configured position.
      // `reopenVim` clamps this against the actual file buffer on open.
      openCursor: options.openCursor ?? state.cursor,
    }
  );
}

/**
 * Launch Vim with no file named: an empty unnamed buffer in normal mode, with
 * the startup splash drawn over it. There is no splash mode and no splash key
 * handling — `:`, `i`, and the motions all reach their ordinary handlers, so
 * `:e <path>` opens a file from here exactly as it would from a file.
 */
export function enterSplash(state: EditorState): EditorState {
  return {
    ...state,
    mode: 'normal',
    buffer: [''],
    activeFilePath: '',
    cursor: { line: 0, col: 0 },
    dirty: false,
    status: '',
    statusIsError: false,
    shell: null,
    splashVisible: true,
    undoStack: [],
    redoStack: [],
  };
}

/**
 * Reopen with `vim`, optionally at a named path: restore that file's **saved**
 * contents, discarding any unsaved edits (`:q!`) while keeping saved ones
 * (`:wq`). Undo history resets, matching a fresh Vim session. The full typed
 * command is recorded, so a lesson can require `vim greetings.md` specifically
 * and not merely that Vim was launched.
 */
function reopenVim(state: EditorState, command: string, path: string): CommandResult {
  const target = getVirtualFile(state.files, path);
  const saved = target?.saved ?? [''];
  const files = setVirtualFile(state.files, path, (file) => ({
    ...file,
    contents: [...saved],
    dirty: false,
  }));

  const buffer = normalizeBuffer(saved);

  return {
    state: {
      ...state,
      files,
      activeFilePath: path,
      buffer,
      // Honor the cursor captured when the shell was entered rather than snapping
      // to the top-left. For a `start: "shell"` lesson that is the seeded
      // `config.cursor`; the shell prompt had overwritten `state.cursor` itself.
      cursor: clampCursor(buffer, state.shell?.openCursor ?? { line: 0, col: 0 }),
      mode: 'normal',
      shell: null,
      splashVisible: false,
      dirty: false,
      status: !target || !target.onDisk ? newFileStatus(path) : '',
      statusIsError: false,
      undoStack: [],
      redoStack: [],
    },
    actions: [{ type: 'mode', command }],
  };
}

/**
 * The file a submitted shell command opens, or null when the shell does not
 * accept it. Bare `vim` reopens whatever was already active; `vim <path>` opens
 * that path — creating an empty buffer for it if it is not on disk, the way
 * real Vim does when handed a filename that does not exist yet.
 */
function resolveOpenTarget(state: EditorState, input: string): string | null {
  if (input === REOPEN_COMMAND) {
    return state.activeFilePath === '' ? null : state.activeFilePath;
  }

  if (!input.startsWith(`${REOPEN_COMMAND} `)) {
    return null;
  }

  const path = input.slice(REOPEN_COMMAND.length).trim();

  return path.length > 0 ? path : null;
}

/**
 * What to say about a submitted command the shell will not run: a real shell's
 * own wording for a command that isn't `vim`. Null for an empty prompt, which is
 * just `Enter` on a blank line and deserves no complaint.
 */
function rejectionMessage(input: string): string | null {
  if (input === '') {
    return null;
  }

  return `command not found: ${input.split(' ')[0]}`;
}

/**
 * Find the start of the previous word boundary in `text` looking leftward from
 * `pos`. Skips non-word characters first, then word characters, landing at the
 * start of the previous word (or 0).
 */
function prevWordBoundary(text: string, pos: number): number {
  let i = pos;
  while (i > 0 && !/\w/.test(text[i - 1])) {
    i--;
  }
  while (i > 0 && /\w/.test(text[i - 1])) {
    i--;
  }
  return i;
}

/**
 * Find the start of the next word boundary in `text` looking rightward from
 * `pos`. Skips word characters first, then non-word characters, landing at the
 * start of the next word (or the end of the string).
 */
function nextWordBoundary(text: string, pos: number): number {
  const len = text.length;
  let i = pos;
  while (i < len && /\w/.test(text[i])) {
    i++;
  }
  while (i < len && !/\w/.test(text[i])) {
    i++;
  }
  return i;
}

const WORD_LEFT_KEYS = new Set(['Alt-ArrowLeft', 'Ctrl-ArrowLeft']);
const WORD_RIGHT_KEYS = new Set(['Alt-ArrowRight', 'Ctrl-ArrowRight']);
const WORD_BACKSPACE_KEYS = new Set(['Alt-Backspace', 'Ctrl-Backspace']);

/**
 * Process one key while in the shell. Printable keys and `Backspace` edit the
 * typed command; arrow keys move the cursor within the input; modifier+arrow
 * jumps by word. `Enter` reopens the editor when the command is `vim`, or `vim`
 * followed by a seeded filename. Any other command clears the prompt and stays
 * in the shell — the shell accepts nothing else.
 */
export function processShellKey(state: EditorState, key: string): CommandResult {
  if (!state.shell) {
    return { state, actions: [] };
  }

  if (key === 'Ctrl-c') {
    const { input, output } = state.shell;
    const next = withShell(state, {
      ...state.shell,
      input: '',
      cursorPos: 0,
      output: [...output, `${SHELL_PROMPT}${input}^C`],
    });
    return { state: { ...next, status: '', statusIsError: false }, actions: [] };
  }

  if (ENTER_KEYS.has(key)) {
    const input = state.shell.input.trim();

    // A bare `vim` always shows the splash, matching real Vim, which never
    // remembers a prior file across invocations. `vim <filename>` opens that
    // specific file.
    if (input === REOPEN_COMMAND) {
      return {
        state: enterSplash(state),
        actions: [{ type: 'mode', command: input }],
      };
    }

    const target = resolveOpenTarget(state, input);

    if (target !== null) {
      return reopenVim(state, input, target);
    }

    // The shell runs nothing but `vim`, so anything else answers instead of
    // clearing the prompt without a word.
    const message = rejectionMessage(input);
    const output =
      message === null
        ? state.shell.output
        : [...state.shell.output, `${SHELL_PROMPT}${input}`, message];
    const next = withShell(state, { ...state.shell, input: '', cursorPos: 0, output });
    return { state: { ...next, status: '', statusIsError: false }, actions: [] };
  }

  if (key === 'Backspace') {
    if (state.shell.cursorPos === 0) {
      return { state, actions: [] };
    }
    const { input, cursorPos } = state.shell;
    return {
      state: withShell(state, {
        ...state.shell,
        input: input.slice(0, cursorPos - 1) + input.slice(cursorPos),
        cursorPos: cursorPos - 1,
      }),
      actions: [],
    };
  }

  if (key === 'Delete') {
    const { input, cursorPos } = state.shell;
    if (cursorPos >= input.length) {
      return { state, actions: [] };
    }
    return {
      state: withShell(state, {
        ...state.shell,
        input: input.slice(0, cursorPos) + input.slice(cursorPos + 1),
      }),
      actions: [],
    };
  }

  if (WORD_BACKSPACE_KEYS.has(key)) {
    if (state.shell.cursorPos === 0) {
      return { state, actions: [] };
    }
    const { input, cursorPos } = state.shell;
    const boundary = prevWordBoundary(input, cursorPos);
    return {
      state: withShell(state, {
        ...state.shell,
        input: input.slice(0, boundary) + input.slice(cursorPos),
        cursorPos: boundary,
      }),
      actions: [],
    };
  }

  if (key === 'ArrowLeft') {
    if (state.shell.cursorPos === 0) {
      return { state, actions: [] };
    }
    return {
      state: withShell(state, { ...state.shell, cursorPos: state.shell.cursorPos - 1 }),
      actions: [],
    };
  }

  if (key === 'ArrowRight') {
    if (state.shell.cursorPos >= state.shell.input.length) {
      return { state, actions: [] };
    }
    return {
      state: withShell(state, { ...state.shell, cursorPos: state.shell.cursorPos + 1 }),
      actions: [],
    };
  }

  if (WORD_LEFT_KEYS.has(key)) {
    return {
      state: withShell(state, {
        ...state.shell,
        cursorPos: prevWordBoundary(state.shell.input, state.shell.cursorPos),
      }),
      actions: [],
    };
  }

  if (WORD_RIGHT_KEYS.has(key)) {
    return {
      state: withShell(state, {
        ...state.shell,
        cursorPos: nextWordBoundary(state.shell.input, state.shell.cursorPos),
      }),
      actions: [],
    };
  }

  if (key === 'Home') {
    return {
      state: withShell(state, { ...state.shell, cursorPos: 0 }),
      actions: [],
    };
  }

  if (key === 'End') {
    return {
      state: withShell(state, { ...state.shell, cursorPos: state.shell.input.length }),
      actions: [],
    };
  }

  if (key.length === 1) {
    const { input, cursorPos } = state.shell;
    return {
      state: withShell(state, {
        ...state.shell,
        input: input.slice(0, cursorPos) + key + input.slice(cursorPos),
        cursorPos: cursorPos + 1,
      }),
      actions: [],
    };
  }

  return { state, actions: [] };
}

/** Insert clipboard text into the shell input at the cursor position. */
export function pasteShellText(state: EditorState, text: string): EditorState {
  if (!state.shell) {
    return state;
  }
  const flat = text.replace(/\n/g, ' ');
  const { input, cursorPos } = state.shell;
  return withShell(state, {
    ...state.shell,
    input: input.slice(0, cursorPos) + flat + input.slice(cursorPos),
    cursorPos: cursorPos + flat.length,
  });
}
