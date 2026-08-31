import { clampCursor, normalizeBuffer } from './buffer';
import { setError } from './state';
import type { Buffer, EditorState, Mode, VirtualFile, VirtualFilesystem } from './types';

export const DEFAULT_FILE_PATH = 'current.txt';

export interface FilesystemSeed {
  activeFilePath?: string;
  files?: Record<string, readonly string[]>;
}

function cloneBuffer(lines: readonly string[]): Buffer {
  return [...normalizeBuffer(lines)];
}

function createVirtualFile(lines: readonly string[], onDisk = true): VirtualFile {
  const normalized = cloneBuffer(lines);
  return {
    contents: normalized,
    dirty: false,
    saved: [...normalized],
    written: false,
    onDisk,
  };
}

/** Vim's own wording for a buffer opened on a path with nothing on disk. */
export function newFileStatus(path: string): string {
  return `"${path}" [New]`;
}

function allowEndColumn(mode: Mode): boolean {
  return mode === 'insert';
}

export function createVirtualFilesystem(
  initialLines: readonly string[] = [''],
  seed: FilesystemSeed = {}
): { activeFilePath: string; files: VirtualFilesystem } {
  const files: VirtualFilesystem = new Map();

  if (seed.files) {
    for (const [path, lines] of Object.entries(seed.files)) {
      files.set(path, createVirtualFile(lines));
    }
  }

  const fallbackPath = seed.activeFilePath ?? DEFAULT_FILE_PATH;
  if (files.size === 0) {
    files.set(fallbackPath, createVirtualFile(initialLines));
    return { activeFilePath: fallbackPath, files };
  }

  const activeFilePath =
    seed.activeFilePath !== undefined &&
    (seed.activeFilePath === '' || files.has(seed.activeFilePath))
      ? seed.activeFilePath
      : (files.keys().next().value as string);

  return { activeFilePath, files };
}

export function getVirtualFile(files: VirtualFilesystem, path: string): VirtualFile | null {
  const file = files.get(path);
  if (!file) {
    return null;
  }

  return {
    contents: [...file.contents],
    dirty: file.dirty,
    saved: [...file.saved],
    written: file.written,
    onDisk: file.onDisk,
  };
}

export function setVirtualFile(
  files: VirtualFilesystem,
  path: string,
  update: (file: VirtualFile) => VirtualFile
): VirtualFilesystem {
  const current = getVirtualFile(files, path) ?? createVirtualFile([''], false);
  const next = update(current);
  const cloned: VirtualFile = {
    contents: cloneBuffer(next.contents),
    dirty: next.dirty,
    saved: cloneBuffer(next.saved),
    written: next.written,
    onDisk: next.onDisk,
  };
  const updated = new Map(files);
  updated.set(path, cloned);
  return updated;
}

/** Vim's refusal to abandon a buffer with unsaved changes. */
export const E37 = 'E37: No write since last change';

/**
 * Vim's refusal to write a buffer that has no filename — the state a bare `vim`
 * starts in. Real Vim wants `:w <path>`; this course does not simulate that
 * argument form, so the error is where the road ends.
 */
export const E32 = 'E32: No file name';

export interface OpenFileResult {
  state: EditorState;
  /** False when Vim refused the switch because the buffer has unsaved edits. */
  opened: boolean;
}

/**
 * Open a path into the buffer, creating an empty buffer for one that isn't on
 * disk the way Vim does, and reporting `"name" [New]` on the status line when it
 * does so. The status is set here rather than by the caller so every route into a
 * file — `:e`, netrw, a shell `vim <path>` — reports the same thing.
 *
 * Unsaved edits block the switch with E37, as they do in real Vim under its
 * default `nohidden`: abandoning the buffer would lose them. `force` is the `!`
 * of `:e!`, which discards them on purpose — so the departed file goes back to
 * its written contents rather than keeping the edits for a later revisit.
 */
export function openVirtualFile(
  state: EditorState,
  path: string,
  options: { force?: boolean } = {}
): OpenFileResult {
  const trimmed = path.trim();
  const filePath = trimmed === '' ? state.activeFilePath : trimmed;

  if (state.dirty && filePath === state.activeFilePath && options.force !== true) {
    const file = getVirtualFile(state.files, filePath);
    const contents = file ? [...file.contents] : [...state.buffer];
    return {
      state: {
        ...state,
        buffer: contents,
        status: '',
        statusIsError: false,
        cursor: clampCursor(contents, state.cursor, allowEndColumn(state.mode)),
      },
      opened: true,
    };
  }

  if (state.dirty && options.force !== true) {
    return { state: setError(state, E37), opened: false };
  }

  const base = state.dirty ? revertVirtualFile(state) : state;

  const ensured = setVirtualFile(base.files, filePath, (file) => file);
  const file = getVirtualFile(ensured, filePath) ?? createVirtualFile([''], false);

  return {
    state: {
      ...base,
      activeFilePath: filePath,
      files: ensured,
      buffer: [...file.contents],
      dirty: file.dirty,
      status: file.onDisk ? '' : newFileStatus(filePath),
      statusIsError: false,
      cursor: clampCursor(file.contents, base.cursor, allowEndColumn(base.mode)),
    },
    opened: true,
  };
}

export function writeVirtualFile(state: EditorState): EditorState {
  const files = setVirtualFile(state.files, state.activeFilePath, (file) => ({
    ...file,
    contents: cloneBuffer(state.buffer),
    saved: cloneBuffer(state.buffer),
    dirty: false,
    written: true,
    onDisk: true,
  }));

  return { ...state, files, dirty: false };
}

/**
 * Throw away unsaved edits to the active file, restoring its last written
 * contents (`:q!`). Without this the buffer would survive a force-quit and a
 * content assertion would still see discarded text.
 */
export function revertVirtualFile(state: EditorState): EditorState {
  const file = getVirtualFile(state.files, state.activeFilePath);
  const saved = file ? file.saved : cloneBuffer(state.buffer);
  const files = setVirtualFile(state.files, state.activeFilePath, (current) => ({
    ...current,
    contents: cloneBuffer(saved),
    dirty: false,
  }));

  return { ...state, files, buffer: cloneBuffer(saved), dirty: false };
}
