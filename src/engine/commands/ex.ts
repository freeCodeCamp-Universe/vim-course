import { enterExplorer } from '../explorer';
import { enterShell } from '../shell';
import { E32, E37, openVirtualFile, revertVirtualFile, writeVirtualFile } from '../filesystem';
import { normalModeRegistry, type CommandResult } from '../registry';
import {
  markDirty,
  setBuffer,
  setError as setErrorState,
  setLineNumbers,
  setMode,
  setStatus,
} from '../state';
import type { Action } from '../actionHistory';
import { actionAttempts } from '../actionHistory';
import type { Buffer, EditorState } from '../types';
import { runCc, runCdo, runClist, runCstep, runGrep, runVimgrep } from './quickfix';
import { buildRegex } from './search';

interface Substitution {
  /** `%` substitutes over every line; a bare `:s` only the cursor's line. */
  range: 'file' | 'line';
  pattern: string;
  replacement: string;
  /** The trailing `g`: replace every match on a line, not just the first. */
  global: boolean;
  /** The `i` flag: match case-insensitively. */
  caseInsensitive: boolean;
  /**
   * The `n` flag: report how many matches there are without changing anything.
   * Turns the substitution into a count query — the buffer and `dirty` are left
   * untouched and the status line reports `N matches on M lines`.
   */
  countOnly: boolean;
}

function setError(state: EditorState, message: string): CommandResult {
  return { state: setErrorState(state, message), actions: [] };
}

function clearDirty(state: EditorState): EditorState {
  return writeVirtualFile(markDirty(state, false));
}

function writeAndQuit(state: EditorState): EditorState {
  return enterShell(clearDirty(state));
}

interface EditRequest {
  path: string;
  /** The `!` of `:e!`: abandon the buffer's unsaved edits instead of refusing. */
  force: boolean;
}

function parseEditRequest(command: string): EditRequest | null {
  const force = command.startsWith('e!');
  const rest = force ? command.slice(2) : command.slice(1);

  if (!command.startsWith('e') || (rest !== '' && !rest.startsWith(' '))) {
    return null;
  }

  const path = rest.trim();
  return path === '' ? null : { path, force };
}

function parseSubstitution(command: string): Substitution | null {
  let range: 'file' | 'line';
  let i: number;
  if (command.startsWith('%s/')) {
    range = 'file';
    i = 3;
  } else if (command.startsWith('s/')) {
    range = 'line';
    i = 2;
  } else {
    return null;
  }

  let pattern = '';
  let replacement = '';
  let escaped = false;

  for (; i < command.length; i++) {
    const ch = command[i];
    if (!escaped && ch === '/') {
      break;
    }
    pattern += ch;
    escaped = !escaped && ch === '\\';
  }

  if (i >= command.length || command[i] !== '/') {
    return null;
  }
  i += 1;
  escaped = false;

  for (; i < command.length; i++) {
    const ch = command[i];
    if (!escaped && ch === '/') {
      break;
    }
    replacement += ch;
    escaped = !escaped && ch === '\\';
  }

  if (i >= command.length || command[i] !== '/') {
    return null;
  }
  i += 1;

  // Accepted flags: `g` (all matches), `i` (case-insensitive), `n` (count only),
  // and any combination of them. Any other trailing text falls through to E492.
  const flag = command.slice(i).trim();
  const flagSet = new Set(flag.split(''));
  if (
    !flag.split('').every((f) => f === 'g' || f === 'i' || f === 'n') ||
    new Set(flag).size !== flag.length
  ) {
    return null;
  }

  return {
    range,
    pattern,
    replacement: replacement.replace(/\\\//g, '/'),
    global: flagSet.has('g'),
    caseInsensitive: flagSet.has('i'),
    countOnly: flagSet.has('n'),
  };
}

/**
 * The spellings of the `number` option this editor accepts, mapped to what each
 * one does to the gutter. Vim allows the abbreviation (`nu`), the `no` prefix to
 * clear a boolean option, and both `!` and the `inv` prefix to flip it.
 */
const NUMBER_OPTIONS = new Map<string, 'on' | 'off' | 'toggle'>([
  ['number', 'on'],
  ['nu', 'on'],
  ['nonumber', 'off'],
  ['nonu', 'off'],
  ['number!', 'toggle'],
  ['nu!', 'toggle'],
  ['invnumber', 'toggle'],
  ['invnu', 'toggle'],
]);

/**
 * Run `:set <option>`. `number` is the only option simulated; anything else
 * reports Vim's own E518 rather than silently pretending to apply. A bare `:set`
 * lists every changed option in real Vim, and this editor has no option table to
 * list, so it asks for the argument instead.
 */
function runSet(state: EditorState, argument: string): CommandResult {
  if (argument === '') {
    return setError(state, 'E471: Argument required');
  }

  const option = NUMBER_OPTIONS.get(argument);
  if (option === undefined) {
    return setError(state, `E518: Unknown option: ${argument}`);
  }

  const show = option === 'toggle' ? !state.showLineNumbers : option === 'on';

  // History records the spelling the learner typed, like every other ex command
  // records its own argument. Canonicalizing here would decide for every lesson
  // that the spellings are interchangeable; leaving it raw lets each checklist
  // item choose, via its `exact` flag, whether `:set nu` counts as `:set number`.
  return {
    state: setStatus(setLineNumbers(state, show), ''),
    actions: [{ type: 'ex', command: `:set ${argument}` }],
  };
}

/**
 * Apply a substitution to the buffer. A non-global regexp makes `String.replace`
 * touch only the first match on each line it runs against, which is exactly the
 * flagless form; the `g` flag replaces every match. The `line` range restricts
 * the map to the cursor's own line, leaving the rest untouched.
 */
function applySubstitution(state: EditorState, parsed: Substitution): Buffer | null {
  const flags = (parsed.global ? 'g' : '') + (parsed.caseInsensitive ? 'i' : '');
  const regexp = buildRegex(parsed.pattern, flags);
  if (!regexp) {
    return null;
  }

  if (parsed.range === 'file') {
    return state.buffer.map((line) => line.replace(regexp, parsed.replacement));
  }

  return state.buffer.map((line, index) =>
    index === state.cursor.line ? line.replace(regexp, parsed.replacement) : line
  );
}

/**
 * Count matches for the `n`-flag query without touching the buffer. The regexp is
 * always global so a line yields all its matches; a non-`g` query then counts at
 * most one per line, mirroring how the mutating form only replaces the first.
 * Returns `null` on an invalid pattern, as `applySubstitution` does.
 */
function countSubstitution(
  state: EditorState,
  parsed: Substitution
): { matches: number; lines: number } | null {
  const regexp = buildRegex(parsed.pattern, 'g' + (parsed.caseInsensitive ? 'i' : ''));
  if (!regexp) {
    return null;
  }

  const range = parsed.range === 'file' ? state.buffer : [state.buffer[state.cursor.line] ?? ''];

  let matches = 0;
  let lines = 0;
  for (const line of range) {
    const found = line.match(regexp);
    if (found) {
      matches += parsed.global ? found.length : 1;
      lines += 1;
    }
  }

  return { matches, lines };
}

function runSubstitute(state: EditorState, command: string): CommandResult {
  const parsed = parseSubstitution(command);
  if (!parsed) {
    return setError(state, `E492: Not an editor command: :${command}`);
  }

  if (parsed.countOnly) {
    const counted = countSubstitution(state, parsed);
    if (counted === null) {
      return setError(state, `E486: Pattern not found: ${parsed.pattern}`);
    }
    // The query ran either way, so record it (a cap keyed to substitutions
    // excludes it by regex); only the message differs on a zero count.
    const status =
      counted.matches === 0
        ? `E486: Pattern not found: ${parsed.pattern}`
        : `${counted.matches} match${counted.matches === 1 ? '' : 'es'} on ${counted.lines} line${counted.lines === 1 ? '' : 's'}`;
    const action: Action = { type: 'ex', command: `:${command}` };
    actionAttempts.set(action, false);
    return { state: setStatus(state, status), actions: [action] };
  }

  const replaced = applySubstitution(state, parsed);
  if (replaced === null) {
    return setError(state, `E486: Pattern not found: ${parsed.pattern}`);
  }

  if (replaced.every((line, index) => line === state.buffer[index])) {
    // Buffer unchanged: either no match, or the replacement equals the matched text.
    // countSubstitution tells us which — only report the error when there is truly
    // no match. (Vim also succeeds silently when the replacement is a no-op.)
    const counted = countSubstitution(state, parsed);
    if (counted === null || counted.matches === 0) {
      return {
        state: setErrorState(state, `E486: Pattern not found: ${parsed.pattern}`),
        actions: [{ type: 'ex', command: `:${command}` }],
      };
    }
    // Match found but text is already in the desired form — record the action
    // without marking the buffer dirty.
    return {
      state: setStatus(state, ''),
      actions: [{ type: 'ex', command: `:${command}` }],
    };
  }

  // A substitution that changed the buffer is an intermediate editing step, not
  // a completed attempt. The learner will typically save next; firing the hint
  // before that would be premature (especially for matchAgainstSaved items).
  const action: Action = { type: 'ex', command: `:${command}` };
  actionAttempts.set(action, false);
  return {
    state: setStatus(setBuffer(markDirty(state), replaced), ''),
    actions: [action],
  };
}

/**
 * Match an ex verb that takes a space-delimited argument (or none). Returns the
 * argument string, `''` for the bare verb, or null when `command` is not this
 * verb. Strict about the following character so `cn` never swallows `cnext`.
 */
function exVerb(command: string, verb: string): string | null {
  if (command === verb) {
    return '';
  }
  if (command.startsWith(`${verb} `)) {
    return command.slice(verb.length + 1);
  }
  return null;
}

function substitutionEnd(command: string): number | null {
  const prefix = command.startsWith('%s/') ? 3 : command.startsWith('s/') ? 2 : -1;
  if (prefix === -1) {
    return null;
  }

  let delimiters = 0;
  let escaped = false;
  for (let index = prefix; index < command.length; index++) {
    const character = command[index];
    if (!escaped && character === '/') {
      delimiters += 1;
      if (delimiters === 2) {
        return index + 1;
      }
    }
    escaped = !escaped && character === '\\';
  }
  return null;
}

function splitExCommandChain(command: string): string[] {
  if (command.startsWith('cdo ')) {
    return [command];
  }

  const start = substitutionEnd(command) ?? 0;
  const segments: string[] = [];
  let segmentStart = 0;
  let escaped = false;
  for (let index = start; index < command.length; index++) {
    const character = command[index];
    if (!escaped && character === '|') {
      segments.push(command.slice(segmentStart, index).trim());
      segmentStart = index + 1;
    }
    escaped = !escaped && character === '\\';
  }
  segments.push(command.slice(segmentStart).trim());
  return segments;
}

/**
 * Route the quickfix verbs (`:vimgrep`, `:grep`, `:cnext`/`:cprev`/`:cc`,
 * `:clist`) and their abbreviations. Returns null when `command` is none of
 * them, so `runExCommand` falls through to its remaining branches.
 */
function runQuickfixCommand(state: EditorState, command: string): CommandResult | null {
  if (command === 'vimgrep' || command.startsWith('vimgrep ') || command.startsWith('vimgrep/')) {
    return runVimgrep(state, command, command.slice('vimgrep'.length));
  }
  if (command === 'grep' || command.startsWith('grep ') || command.startsWith('grep!')) {
    return runGrep(state, command, command.slice('grep'.length));
  }
  if (['cnext', 'cn'].some((verb) => exVerb(command, verb) !== null)) {
    return runCstep(state, true, ':cnext');
  }
  if (['cprevious', 'cprev', 'cp', 'cNext', 'cN'].some((verb) => exVerb(command, verb) !== null)) {
    return runCstep(state, false, ':cprev');
  }
  const ccArgs = exVerb(command, 'cc');
  if (ccArgs !== null) {
    return runCc(state, ccArgs, ':cc');
  }
  if (['clist', 'cl'].some((verb) => exVerb(command, verb) !== null)) {
    return runClist(state, ':clist');
  }
  const cdoArgs = exVerb(command, 'cdo');
  if (cdoArgs !== null) {
    return runCdo(state, cdoArgs);
  }
  return null;
}

/** Execute one ex command body (without requiring the leading `:`). */
export function runExCommand(state: EditorState, rawCommand: string): CommandResult {
  const trimmed = rawCommand.trim();
  if (trimmed === '') {
    return { state, actions: [] };
  }

  const commandChain = splitExCommandChain(trimmed);
  if (commandChain.length > 1) {
    let nextState = state;
    const actions: Action[] = [];
    for (const segment of commandChain) {
      const result = runExCommand(nextState, segment);
      if (result.actions) {
        actions.push(...result.actions);
      }
      nextState = result.state;
      if (nextState.statusIsError) {
        return { state: nextState, actions };
      }
    }
    return { state: nextState, actions };
  }

  const command = trimmed.startsWith(':') ? trimmed.slice(1) : trimmed;

  // A write needs somewhere to write to: the buffer a bare `vim` opens has no
  // filename, so `:w` and `:wq` report E32 rather than pretending to save.
  if (
    (command === 'w' || command === 'wq' || command === 'update') &&
    state.activeFilePath === ''
  ) {
    return setError(state, E32);
  }

  if (command === 'w') {
    return {
      state: setStatus(clearDirty(state), ''),
      actions: [{ type: 'ex', command: ':w' }],
    };
  }

  if (command === 'update') {
    if (!state.dirty) {
      return { state, actions: [] };
    }
    return {
      state: setStatus(clearDirty(state), ''),
      actions: [{ type: 'ex', command: ':update' }],
    };
  }

  const edit = parseEditRequest(command);
  if (edit !== null) {
    const opened = openVirtualFile(state, edit.path, { force: edit.force });
    // A refused `:e` never opened the file, so it records no action: a checklist
    // item asking for it must not latch on the attempt.
    return {
      state: opened.state,
      actions: opened.opened
        ? [{ type: 'ex', command: `:e${edit.force ? '!' : ''} ${edit.path}` }]
        : [],
    };
  }

  if (command === 'e' || command === 'e!') {
    return setError(state, 'E471: Argument required');
  }

  if (command === 'q') {
    if (state.dirty) {
      // A refused `:q` records no action, matching a refused `:e`: a checklist
      // item asking to quit must not latch on a `:q` that was rejected because
      // the buffer had unsaved changes and Vim stayed open.
      return {
        state: setErrorState(state, E37),
        actions: [],
      };
    }

    return {
      state: setStatus(enterShell(state), ''),
      actions: [{ type: 'ex', command: ':q' }],
    };
  }

  if (command === 'q!') {
    return {
      state: setStatus(enterShell(revertVirtualFile(state)), ''),
      actions: [{ type: 'ex', command: ':q!' }],
    };
  }

  if (command === 'wq') {
    return {
      state: setStatus(writeAndQuit(state), ''),
      actions: [{ type: 'ex', command: ':wq' }],
    };
  }

  if (command === 'Explore') {
    return {
      state: enterExplorer(setStatus(state, '')),
      actions: [{ type: 'ex', command: ':Explore' }],
    };
  }

  if (command === 'set' || command.startsWith('set ')) {
    return runSet(state, command.slice(3).trim());
  }

  if (command.startsWith('%s/') || command.startsWith('s/')) {
    return runSubstitute(state, command);
  }

  const quickfix = runQuickfixCommand(state, command);
  if (quickfix !== null) {
    return quickfix;
  }

  return setError(state, `E492: Not an editor command: :${command}`);
}

normalModeRegistry.register(':', ({ state }) => ({
  state: {
    ...setMode(state, 'command-line'),
    commandLine: '',
    commandLineCursor: 0,
    commandLinePrompt: ':',
    commandLineRegisterPending: false,
  },
  actions: [{ type: 'mode', command: ':' }],
}));
