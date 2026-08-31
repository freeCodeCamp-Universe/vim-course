import type { Action } from '../actionHistory';
import { actionAttempts } from '../actionHistory';
import { getVirtualFile, openVirtualFile, setVirtualFile } from '../filesystem';
import type { CommandResult } from '../registry';
import { moveCursor, setError as setErrorState, setStatus } from '../state';
import type { Cursor, EditorState, QuickfixEntry, QuickfixList } from '../types';
import { runExCommand } from './ex';
import { findMatches } from './search';

const E42 = 'E42: No Errors';
const E553 = 'E553: No more items';
const E683 = 'E683: File name missing or invalid pattern';
const E682 = 'E682: Invalid search pattern or delimiter';
const noMatch = (pattern: string) => `E480: No match: ${pattern}`;

function setError(state: EditorState, message: string): CommandResult {
  return { state: setErrorState(state, message), actions: [] };
}

/**
 * A `:vimgrep` search argument: the pattern between the `/` delimiters plus the
 * `g`/`j` flags that follow the closing slash. `g` widens the list from one
 * entry per line to one per match; `j` suppresses the jump to the first match.
 */
interface VimgrepArgs {
  pattern: string;
  everyMatch: boolean;
  noJump: boolean;
  glob: string;
}

function parseVimgrepArgs(rest: string): VimgrepArgs | 'bad-pattern' | 'no-file' {
  const trimmed = rest.trimStart();

  // Slash-free form: `:vimgrep pattern files` (first token is pattern, rest is glob)
  if (!trimmed.startsWith('/')) {
    const firstSpace = trimmed.indexOf(' ');
    if (firstSpace === -1) {
      return 'no-file';
    }
    const pattern = trimmed.slice(0, firstSpace);
    const glob = trimmed.slice(firstSpace + 1).trim();
    if (pattern === '') {
      return 'bad-pattern';
    }
    if (glob === '') {
      return 'no-file';
    }
    return { pattern, everyMatch: false, noJump: false, glob };
  }

  let i = 1;
  let pattern = '';
  let escaped = false;
  for (; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (!escaped && ch === '/') {
      break;
    }
    pattern += ch;
    escaped = !escaped && ch === '\\';
  }
  if (i >= trimmed.length || trimmed[i] !== '/') {
    return 'bad-pattern';
  }
  i += 1;

  let everyMatch = false;
  let noJump = false;
  for (; i < trimmed.length && trimmed[i] !== ' '; i++) {
    if (trimmed[i] === 'g') {
      everyMatch = true;
    } else if (trimmed[i] === 'j') {
      noJump = true;
    }
  }

  const glob = trimmed.slice(i).trim();
  if (pattern === '') {
    return 'bad-pattern';
  }
  if (glob === '') {
    return 'no-file';
  }
  return { pattern, everyMatch, noJump, glob };
}

/**
 * The on-disk paths a glob selects. The virtual filesystem is a flat map with no
 * directory tree, so a glob is matched as a string: `*`/`**` take everything,
 * `*.ext` matches by suffix, and anything else is an exact filename.
 */
function matchGlob(state: EditorState, glob: string): string[] {
  const paths = [...state.files.entries()]
    .filter(([, file]) => file.onDisk)
    .map(([path]) => path)
    .sort();

  if (glob === '*' || glob === '**') {
    return paths;
  }
  if (glob.startsWith('*.')) {
    const suffix = glob.slice(1);
    return paths.filter((path) => path.endsWith(suffix));
  }
  return paths.filter((path) => path === glob);
}

/** Keep only the first match on each line, Vim's default when `g` is absent. */
function firstPerLine(matches: Cursor[]): Cursor[] {
  const seen = new Set<number>();
  return matches.filter((match) => {
    if (seen.has(match.line)) {
      return false;
    }
    seen.add(match.line);
    return true;
  });
}

/**
 * Search every glob-matched file for `pattern` and flatten the hits into
 * quickfix entries. The active file is read from the live buffer so unsaved
 * edits are searched the way Vim searches a loaded buffer; other files are read
 * from their stored contents.
 */
function buildEntries(
  state: EditorState,
  paths: string[],
  pattern: string,
  everyMatch: boolean
): QuickfixEntry[] {
  const entries: QuickfixEntry[] = [];
  for (const path of paths) {
    const file = getVirtualFile(state.files, path);
    if (!file) {
      continue;
    }
    const contents = path === state.activeFilePath ? state.buffer : file.contents;
    const matches = everyMatch
      ? findMatches(contents, pattern)
      : firstPerLine(findMatches(contents, pattern));
    for (const match of matches) {
      entries.push({ path, line: match.line, col: match.col, text: contents[match.line] ?? '' });
    }
  }
  return entries;
}

/** `(i of N): text` — Vim's status line after landing on a quickfix entry. */
function jumpStatus(list: QuickfixList): string {
  const entry = list.entries[list.index];
  return `(${list.index + 1} of ${list.entries.length}): ${entry.text.trim()}`;
}

/**
 * Land on `index` in the current quickfix list: open the entry's file, move the
 * cursor to the match, and set the `(i of N)` status. A jump into a different
 * file is refused when the current buffer has unsaved edits (E37, from
 * `openVirtualFile`); the list and index are left where they were and no action
 * is recorded, matching every other blocked buffer switch.
 */
function jumpToIndex(state: EditorState, index: number, command: string): CommandResult {
  const list = state.quickfix;
  if (!list) {
    return setError(state, E42);
  }

  const entry = list.entries[index];
  const opened = openVirtualFile(state, entry.path);
  if (!opened.opened) {
    return { state: opened.state, actions: [] };
  }

  const landed = moveCursor(
    { ...opened.state, quickfix: { ...list, index } },
    { line: entry.line, col: entry.col }
  );
  const action: Action = { type: 'ex', command };
  actionAttempts.set(action, false);
  return {
    state: setStatus(landed, jumpStatus({ ...list, index })),
    actions: [action],
  };
}

function checkpointDirtyBuffer(state: EditorState): EditorState {
  if (!state.dirty || state.activeFilePath === '') {
    return state;
  }
  return {
    ...state,
    files: setVirtualFile(state.files, state.activeFilePath, (file) => ({
      ...file,
      contents: [...state.buffer],
      dirty: true,
    })),
    dirty: false,
  };
}

/** `:cdo {cmd}` — run an Ex command for every quickfix entry. */
export function runCdo(state: EditorState, argument: string): CommandResult {
  const list = state.quickfix;
  if (!list || list.entries.length === 0) {
    return setError(state, E42);
  }

  let nextState = state;
  for (let index = 0; index < list.entries.length; index++) {
    const prepared = checkpointDirtyBuffer(nextState);
    const landed = jumpToIndex({ ...prepared, quickfix: { ...list, index } }, index, '');
    if (landed.state.statusIsError) {
      return { state: landed.state, actions: [] };
    }

    const result = runExCommand(landed.state, argument);
    if (result.state.statusIsError) {
      return { state: result.state, actions: [] };
    }
    nextState = result.state;
  }

  const action: Action = { type: 'ex', command: `:cdo ${argument}` };
  actionAttempts.set(action, false);
  return {
    state: nextState,
    actions: [action],
  };
}

function runGrepLike(
  state: EditorState,
  pattern: string,
  everyMatch: boolean,
  noJump: boolean,
  glob: string,
  command: string
): CommandResult {
  const entries = buildEntries(state, matchGlob(state, glob), pattern, everyMatch);

  if (entries.length === 0) {
    // A valid pattern that matched nothing keeps the previous list (Vim leaves it
    // navigable) and still records the command, like `:%s` on a no-op match.
    const action: Action = { type: 'ex', command };
    actionAttempts.set(action, false);
    return { state: setErrorState(state, noMatch(pattern)), actions: [action] };
  }

  if (noJump) {
    const action: Action = { type: 'ex', command };
    actionAttempts.set(action, false);
    return {
      state: setStatus({ ...state, quickfix: { entries, index: -1 } }, ''),
      actions: [action],
    };
  }

  return jumpToIndex({ ...state, quickfix: { entries, index: 0 } }, 0, command);
}

/** `:vimgrep /{pattern}/[g][j] {file}` — build the quickfix list and jump. */
export function runVimgrep(state: EditorState, command: string, rest: string): CommandResult {
  const parsed = parseVimgrepArgs(rest);
  if (parsed === 'bad-pattern') {
    return setError(state, E682);
  }
  if (parsed === 'no-file') {
    return setError(state, E683);
  }
  return runGrepLike(
    state,
    parsed.pattern,
    parsed.everyMatch,
    parsed.noJump,
    parsed.glob,
    `:${command}`
  );
}

/**
 * `:grep[!] {pattern} {file}` — like `:vimgrep` but with the slash-free syntax of
 * a real external `grep`. `!` suppresses the jump (Vim's `:grep!`). Matching is
 * always literal-regex over the file contents, since there is no shell here.
 */
export function runGrep(state: EditorState, command: string, rest: string): CommandResult {
  const noJump = rest.startsWith('!');
  const args = (noJump ? rest.slice(1) : rest).trim();
  const firstSpace = args.indexOf(' ');
  if (firstSpace === -1) {
    return setError(state, E683);
  }

  const pattern = args.slice(0, firstSpace);
  const glob = args.slice(firstSpace + 1).trim();
  if (pattern === '' || glob === '') {
    return setError(state, E683);
  }

  return runGrepLike(state, pattern, false, noJump, glob, `:${command}`);
}

/** `:cnext` / `:cprev` — step to the next/previous entry; the list does not wrap. */
export function runCstep(state: EditorState, forward: boolean, command: string): CommandResult {
  const list = state.quickfix;
  if (!list) {
    return setError(state, E42);
  }

  const target = list.index + (forward ? 1 : -1);
  if (target < 0 || target >= list.entries.length) {
    return setError(state, E553);
  }
  return jumpToIndex(state, target, command);
}

/** `:cc [nr]` — jump to entry `nr` (1-based), or re-show the current one. */
export function runCc(state: EditorState, rest: string, command: string): CommandResult {
  const list = state.quickfix;
  if (!list) {
    return setError(state, E42);
  }

  const arg = rest.trim();
  const target = arg === '' ? Math.max(0, list.index) : Number.parseInt(arg, 10) - 1;
  if (Number.isNaN(target) || target < 0 || target >= list.entries.length) {
    return setError(state, E553);
  }
  return jumpToIndex(state, target, command);
}

/** `:clist` — draw the whole list over the buffer until the next keystroke. */
export function runClist(state: EditorState, command: string): CommandResult {
  const list = state.quickfix;
  if (!list || list.entries.length === 0) {
    return setError(state, E42);
  }
  const action: Action = { type: 'ex', command };
  actionAttempts.set(action, false);
  return {
    state: setStatus({ ...state, quickfixListing: true }, ''),
    actions: [action],
  };
}
