import { normalModeRegistry, type CommandResult } from '../registry';
import { moveCursor, setError, setMode, setStatus } from '../state';
import type { Buffer, Cursor, EditorState } from '../types';

/**
 * Buffer search: `/pattern`, `n`, `N`. `/` opens a command-line-style prompt
 * (handled by `commandLine.ts`, which calls `runSearch` on Enter); `n`/`N`
 * repeat the last search forward/backward. Matching uses the same
 * `new RegExp(pattern, 'g')` semantics as `:%s` (Task 8), so the two stay
 * consistent. Every search records a `search` action for workshop validators.
 */

const NO_PATTERN = 'E35: No previous regular expression';
const notFound = (pattern: string) => `E486: Pattern not found: ${pattern}`;
const WRAP_BOTTOM = 'search hit BOTTOM, continuing at TOP';
const WRAP_TOP = 'search hit TOP, continuing at BOTTOM';

/**
 * Parse Vim's `\c` (case-insensitive) and `\C` (case-sensitive) inline flags.
 * The last occurrence wins, matching Vim behavior. The flag is stripped from the
 * pattern so the remainder is valid regex.
 */
export function parseCaseFlag(pattern: string): { cleaned: string; ignoreCase: boolean } {
  let ignoreCase = false;
  // Process all \c and \C flags; last one wins (Vim behavior).
  const cleaned = pattern.replace(/\\[cC]/g, (match) => {
    ignoreCase = match === '\\c';
    return '';
  });
  return { cleaned, ignoreCase };
}

/**
 * Build a RegExp from a Vim search pattern, applying Vim's rule that a
 * quantifier (`*`, `+`, `?`, `{`) with no preceding atom is treated as a
 * literal character rather than a syntax error. Tries the pattern as-is
 * first; on failure, escapes bare quantifiers at atom-less positions and
 * retries. Returns `null` when the pattern is irrecoverably invalid.
 */
export function buildRegex(pattern: string, flags: string): RegExp | null {
  try {
    return new RegExp(pattern, flags);
  } catch {
    const fixed = pattern.replace(/(^|[|(])([*+?{])/g, '$1\\$2');
    try {
      return new RegExp(fixed, flags);
    } catch {
      return null;
    }
  }
}

/**
 * All match start positions in document order. An invalid regex or no match
 * yields an empty list, so the caller reports "pattern not found" for both.
 *
 * Supports Vim's `\c` (case-insensitive) and `\C` (case-sensitive) inline
 * flags anywhere in the pattern.
 */
export function findMatches(buffer: Buffer, pattern: string): Cursor[] {
  const { cleaned, ignoreCase } = parseCaseFlag(pattern);
  const regex = buildRegex(cleaned, ignoreCase ? 'gi' : 'g');
  if (!regex) {
    return [];
  }

  const matches: Cursor[] = [];
  buffer.forEach((text, line) => {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      matches.push({ line, col: match.index });
      // Advance past zero-width matches so the scan terminates.
      regex.lastIndex = match.index + Math.max(1, match[0].length);
    }
  });
  return matches;
}

function isAfter(a: Cursor, b: Cursor): boolean {
  return a.line > b.line || (a.line === b.line && a.col > b.col);
}

function isBefore(a: Cursor, b: Cursor): boolean {
  return a.line < b.line || (a.line === b.line && a.col < b.col);
}

interface Found {
  pos: Cursor;
  wrapped: boolean;
}

function forwardFrom(matches: Cursor[], cursor: Cursor): Found | null {
  const next = matches.find((m) => isAfter(m, cursor));
  if (next) {
    return { pos: next, wrapped: false };
  }
  return matches.length > 0 ? { pos: matches[0], wrapped: true } : null;
}

function backwardFrom(matches: Cursor[], cursor: Cursor): Found | null {
  for (let i = matches.length - 1; i >= 0; i--) {
    if (isBefore(matches[i], cursor)) {
      return { pos: matches[i], wrapped: false };
    }
  }
  return matches.length > 0 ? { pos: matches[matches.length - 1], wrapped: true } : null;
}

function jump(
  state: EditorState,
  command: string,
  pattern: string,
  found: Found | null,
  wrapMessage: string
): CommandResult {
  const actions = [{ type: 'search' as const, command }];
  const withLast: EditorState = { ...state, lastSearch: { pattern } };
  if (!found) {
    return { state: setError(withLast, notFound(pattern)), actions };
  }
  return {
    state: setStatus(moveCursor(withLast, found.pos), found.wrapped ? wrapMessage : ''),
    actions,
  };
}

/** Execute `/pattern`: jump to the next match after the cursor, wrapping around. */
export function runSearch(state: EditorState, rawPattern: string): CommandResult {
  const pattern = rawPattern === '' ? (state.lastSearch?.pattern ?? '') : rawPattern;
  if (pattern === '') {
    return {
      state: setError(state, NO_PATTERN),
      actions: [{ type: 'search', command: '/' + pattern }],
    };
  }
  const matches = findMatches(state.buffer, pattern);
  return jump(state, '/' + pattern, pattern, forwardFrom(matches, state.cursor), WRAP_BOTTOM);
}

function repeat(state: EditorState, command: string, backward: boolean): CommandResult {
  const last = state.lastSearch;
  if (!last) {
    return { state: setError(state, NO_PATTERN), actions: [{ type: 'search', command }] };
  }
  const matches = findMatches(state.buffer, last.pattern);
  const found = backward ? backwardFrom(matches, state.cursor) : forwardFrom(matches, state.cursor);
  return jump(state, command, last.pattern, found, backward ? WRAP_TOP : WRAP_BOTTOM);
}

normalModeRegistry.register('/', ({ state }) => ({
  state: {
    ...setMode(state, 'command-line'),
    commandLine: '',
    commandLineCursor: 0,
    commandLinePrompt: '/',
    commandLineRegisterPending: false,
  },
  actions: [{ type: 'mode', command: '/' }],
}));

normalModeRegistry.register('n', ({ state }) => repeat(state, 'n', false));
normalModeRegistry.register('N', ({ state }) => repeat(state, 'N', true));
