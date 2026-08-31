import { openVirtualFile } from './filesystem';
import { normalModeRegistry, type CommandResult } from './registry';
import { setMode } from './state';
import type { EditorState } from './types';
import { isReportableKey, unsupported, unsupportedInMode } from './unsupported';

const ENTER_KEYS = new Set(['Enter', 'Return']);

/** Return the parent directory for a normalized directory path. */
function parentCwd(cwd: string): string {
  const withoutTrailingSlash = cwd.slice(0, -1);
  const parentSlash = withoutTrailingSlash.lastIndexOf('/');
  return parentSlash === -1 ? '' : withoutTrailingSlash.slice(0, parentSlash + 1);
}

/**
 * The explorer's listing rows for one directory. A path conjured by `:e
 * <missing>` and never written is skipped — netrw lists only files on disk.
 */
export function listEntries(state: EditorState, cwd: string): string[] {
  const directories = new Set<string>();
  const files: string[] = [];

  for (const [path, file] of state.files.entries()) {
    if (!file.onDisk || !path.startsWith(cwd)) {
      continue;
    }

    const remainder = path.slice(cwd.length);
    const slash = remainder.indexOf('/');
    if (slash === -1) {
      files.push(remainder);
    } else {
      directories.add(`${remainder.slice(0, slash)}/`);
    }
  }

  return [...files, ...directories].sort();
}

/**
 * Build the explorer listing for `cwd`. When moving to a parent directory,
 * keep the selection on the directory the learner just left.
 */
export function enterExplorerAt(state: EditorState, cwd: string): EditorState {
  const entries = listEntries(state, cwd);
  const withParent = cwd === '' ? entries : ['../', ...entries];
  const cameFrom = state.explorer?.cwd;
  const cameFromParent =
    cameFrom && parentCwd(cameFrom) === cwd ? `${cameFrom.slice(cwd.length)}` : null;
  const selected = cameFromParent ? Math.max(0, withParent.indexOf(cameFromParent)) : 0;

  return {
    ...setMode(state, 'explorer'),
    explorer: { entries: withParent, selected, cwd },
    buffer: withParent.length === 0 ? [''] : [...withParent],
    cursor: { line: selected, col: 0 },
  };
}

/**
 * Enter the netrw explorer: a read-only listing of the virtual filesystem.
 * Selection starts on the active file (or the first row when it is absent). The
 * buffer mirrors the listing so a plain renderer shows the rows; the `explorer`
 * field carries the selection the terminal binding highlights (Task 16).
 */
export function enterExplorer(state: EditorState): EditorState {
  const slash = state.activeFilePath.lastIndexOf('/');
  const cwd = slash === -1 ? '' : state.activeFilePath.slice(0, slash + 1);
  const entered = enterExplorerAt({ ...state, explorer: null }, cwd);
  const remainder = state.activeFilePath.slice(cwd.length);
  const activeEntry = remainder.includes('/') ? `${remainder.split('/')[0]}/` : remainder;
  const selected = Math.max(0, entered.explorer?.entries.indexOf(activeEntry) ?? 0);

  return entered.explorer
    ? {
        ...entered,
        explorer: { ...entered.explorer, selected },
        cursor: { line: selected, col: 0 },
      }
    : entered;
}

/** Move the explorer selection by `delta`, clamped to the listing bounds. */
export function moveExplorerSelection(state: EditorState, delta: number): EditorState {
  if (!state.explorer || state.explorer.entries.length === 0) {
    return state;
  }

  const { entries } = state.explorer;
  const selected = Math.min(entries.length - 1, Math.max(0, state.explorer.selected + delta));

  return {
    ...state,
    explorer: { entries, selected, cwd: state.explorer.cwd },
    cursor: { line: selected, col: 0 },
  };
}

/** Open the selected file into the buffer, leaving explorer for normal mode. */
export function openExplorerSelection(state: EditorState): CommandResult {
  if (!state.explorer || state.explorer.entries.length === 0) {
    return { state, actions: [] };
  }

  const selectedEntry = state.explorer.entries[state.explorer.selected];
  if (selectedEntry === '../') {
    return { state: enterExplorerAt(state, parentCwd(state.explorer.cwd)), actions: [] };
  }

  if (selectedEntry.endsWith('/')) {
    return { state: enterExplorerAt(state, state.explorer.cwd + selectedEntry), actions: [] };
  }

  const path = state.explorer.cwd + selectedEntry;
  const opened = openVirtualFile(state, path);

  // Unsaved edits refuse the switch (E37), as they do for `:e`. netrw stays on
  // screen so the learner can write first, and no action is recorded.
  if (!opened.opened) {
    return { state: opened.state, actions: [] };
  }

  return {
    state: {
      ...setMode(opened.state, 'normal'),
      explorer: null,
      cursor: { line: 0, col: 0 },
    },
    actions: [{ type: 'ex', command: `:e ${path}` }],
  };
}

/**
 * Process one key while in explorer state. Navigation keys move the selection,
 * Enter opens or enters the selected row, and `-` moves to the parent directory.
 *
 * A refused key that the course teaches elsewhere (`i`, `:`) is refused *by mode*,
 * so the learner is never told a command they have been taught does not exist; a
 * key the course simulates nowhere (`f`) gets the plain message.
 */
export function processExplorerKey(state: EditorState, key: string): CommandResult {
  if (key === 'j' || key === 'ArrowDown') {
    return { state: moveExplorerSelection(state, 1), actions: [{ type: 'motion', command: key }] };
  }

  if (key === 'k' || key === 'ArrowUp') {
    return { state: moveExplorerSelection(state, -1), actions: [{ type: 'motion', command: key }] };
  }

  if (ENTER_KEYS.has(key)) {
    return openExplorerSelection(state);
  }

  if (key === '-') {
    if (!state.explorer || state.explorer.cwd === '') {
      return { state, actions: [] };
    }
    return { state: enterExplorerAt(state, parentCwd(state.explorer.cwd)), actions: [] };
  }

  if (!isReportableKey(key)) {
    return { state, actions: [] };
  }
  return normalModeRegistry.has(key)
    ? unsupportedInMode(state, key, 'the file explorer')
    : unsupported(state, key);
}
