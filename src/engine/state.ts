import { clampCursor, normalizeBuffer } from './buffer';
import { createVirtualFilesystem, type FilesystemSeed, setVirtualFile } from './filesystem';
import type { Buffer, Cursor, EditorState, Mode, Register } from './types';

export function createState(
  lines: readonly string[] = [''],
  seed: FilesystemSeed = {}
): EditorState {
  const { activeFilePath, files } = createVirtualFilesystem(lines, seed);
  const activeFile = files.get(activeFilePath);

  return {
    buffer: activeFile ? [...activeFile.contents] : normalizeBuffer(lines),
    activeFilePath,
    files,
    cursor: { line: 0, col: 0 },
    desiredCol: null,
    mode: 'normal',
    commandLine: '',
    commandLineCursor: 0,
    commandLinePrompt: ':',
    commandLineRegisterPending: false,
    dirty: activeFile?.dirty ?? false,
    status: '',
    statusIsError: false,
    showLineNumbers: false,
    explorer: null,
    shell: null,
    splashVisible: false,
    visualAnchor: null,
    pendingOperator: null,
    pendingTextObject: null,
    pendingCount: '',
    register: null,
    lastSearch: null,
    quickfix: null,
    quickfixListing: false,
    quickfixScrollOffset: 0,
    undoStack: [],
    redoStack: [],
    terrain: null,
    animation: null,
    completionShown: false,
    history: [],
  };
}

function allowsEndColumn(mode: Mode): boolean {
  return mode === 'insert';
}

/** Move the cursor, clamping it to a valid position for the current mode. */
export function moveCursor(state: EditorState, cursor: Cursor): EditorState {
  return { ...state, cursor: clampCursor(state.buffer, cursor, allowsEndColumn(state.mode)) };
}

/** Replace the buffer, re-clamping the cursor so it stays in bounds. */
export function setBuffer(state: EditorState, buffer: Buffer): EditorState {
  const next = normalizeBuffer(buffer);
  const files = setVirtualFile(state.files, state.activeFilePath, (file) => ({
    ...file,
    contents: [...next],
    dirty: state.dirty,
  }));

  return {
    ...state,
    files,
    buffer: next,
    cursor: clampCursor(next, state.cursor, allowsEndColumn(state.mode)),
  };
}

/** Switch modes, re-clamping the cursor since the valid column range shifts. */
export function setMode(state: EditorState, mode: Mode): EditorState {
  return { ...state, mode, cursor: clampCursor(state.buffer, state.cursor, allowsEndColumn(mode)) };
}

export function setStatus(state: EditorState, status: string): EditorState {
  return { ...state, status, statusIsError: false };
}

export function setError(state: EditorState, message: string): EditorState {
  return { ...state, status: message, statusIsError: true };
}

export function markDirty(state: EditorState, dirty = true): EditorState {
  const files = setVirtualFile(state.files, state.activeFilePath, (file) => ({ ...file, dirty }));
  return { ...state, files, dirty };
}

/** Show or hide the line-number gutter (`:set number` / `:set nonumber`). */
export function setLineNumbers(state: EditorState, showLineNumbers: boolean): EditorState {
  return { ...state, showLineNumbers };
}

/** Fill the unnamed register with deleted/changed/yanked content. */
export function setRegister(state: EditorState, register: Register): EditorState {
  return { ...state, register };
}
