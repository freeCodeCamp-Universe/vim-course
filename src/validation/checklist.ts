import { actionCursors, actionModes, type Action } from '@/engine';
import type { Mode, QuickfixList, Register } from '@/engine/types';
import {
  isLatchingTest,
  type AuthoredLessonDefinition,
  type CommandMatcher,
  type CursorAtPosition,
  type LessonTest,
  type LineTest,
  type OccurrenceTest,
  type QuickfixTest,
  type RegisterTest,
} from '@/curriculum/types';
import { normalizeWhitespace } from '@/curriculum/whitespace';
import { matchNeedle, parseNeedleRegex } from '@/curriculum/needle';

/** The working/saved contents (as line arrays) and write state of one virtual file. */
export interface LessonFileState {
  contents: readonly string[];
  saved: readonly string[];
  dirty: boolean;
  /** True once the file has been written at least once. */
  written: boolean;
}

/**
 * The slice of Vim engine state a checklist requirement is checked against. Kept
 * narrow so the validator is a pure function unit-testable without the engine.
 *
 * `file` resolves any path to its working/saved contents; the active file's
 * working copy is its live buffer while the editor is open (the filesystem lags
 * until `:w`). `inShell` is true once Vim has been quit and the learner is back
 * at the terminal.
 */
export interface ChecklistContext {
  history: readonly Action[];
  register: Register | null;
  activeFilePath: string;
  /** The live cursor, 0-based as the engine records it. */
  cursor: { line: number; col: number };
  file: (path: string) => LessonFileState | null;
  inShell: boolean;
  /** Whether the line-number gutter is currently on. */
  showLineNumbers: boolean;
  /** The current quickfix list; null until the first :vimgrep/:grep run. */
  quickfix: QuickfixList | null;
  /** True while a quickfix listing is displayed over the active buffer. */
  quickfixListing: boolean;
  /** Positions the cursor has visited, keyed as "line,col". null when tracking is off. */
  visitedPositions: ReadonlySet<string> | null;
}

/**
 * One requirement's outcome. `monotonic` tells the runtime whether it may latch
 * this item once it passes. It is a generic flag by design, so the runtime never
 * inspects Vim's test shapes.
 */
export interface RequirementResult {
  passed: boolean;
  monotonic: boolean;
  /**
   * True when the item's `evaluateWhen` condition is not yet met, so the test was
   * not run. A deferred result is always `passed: false`, and attempts should not
   * reveal its hint — the learner has not reached this step yet.
   */
  deferred?: boolean;
  /** For multi-position cursorAt: positions visited so far. */
  count?: number;
  /** For multi-position cursorAt: total positions required. */
  total?: number;
}

/** `Esc` is recorded as the engine's `Escape`; treat them as the same command. */
function normalizeCommand(recorded: string): string {
  return recorded === 'Escape' ? 'Esc' : recorded;
}

/**
 * Whether a recorded command satisfies a requirement's `command`. Exact match,
 * count-agnostic (the base command is recorded regardless of count). A verb also
 * matches its argument form (`:e` matches `:e file.txt`, `vim` matches
 * `vim notes.md`), and a `:`-verb its slash-delimited form (`:%s` matches
 * `:%s/a/b/g`) — but never a longer verb, since the delimiter is required after
 * the verb, so `:w` never matches `:wq`.
 *
 * The relation is one-way on purpose: requiring `vim greetings.md` is not
 * satisfied by a bare `vim`, since the lesson asked for the argument.
 *
 * `exact` drops the argument and slash forms, leaving equality alone, for a
 * lesson that teaches one specific spelling.
 *
 * A `want` written as a `/pattern/flags` literal (the same needle convention as
 * `contains`/`absent`) is instead tested as a regex against the whole recorded
 * command, so a lesson can discriminate on flags the exact-or-prefix rule cannot
 * see — e.g. cap `:%s/a/b/g` while leaving the `:%s/a//gn` count query uncapped.
 * The regex ignores `exact`, since the author already controls the spelling. The
 * loader compiles every such pattern, so `new RegExp` cannot throw here.
 */
export function commandMatches(recorded: string, want: string, exact: boolean): boolean {
  const normalized = normalizeCommand(recorded);

  const wantRegex = parseNeedleRegex(want);
  if (wantRegex) {
    return new RegExp(wantRegex.source, wantRegex.flags).test(normalized);
  }

  if (normalized === want) {
    return true;
  }

  if (exact) {
    return false;
  }

  if (recorded.startsWith(`${want} `)) {
    return true;
  }

  return want.startsWith(':') && recorded.startsWith(`${want}/`);
}

interface ParsedCommandMatcher {
  command: string;
  exact: boolean;
  count?: number;
  atCursor?: CursorAtPosition;
  fromMode?: Mode;
}

function parseCommandMatcher(
  matcher: CommandMatcher,
  fallbackExact = false,
  fallbackCount?: number,
  fallbackAtCursor?: CursorAtPosition
): ParsedCommandMatcher {
  if (typeof matcher === 'string') {
    return {
      command: matcher,
      exact: fallbackExact,
      count: fallbackCount,
      atCursor: fallbackAtCursor,
      fromMode: undefined,
    };
  }

  return {
    command: matcher.command,
    exact: matcher.exact === true,
    count: matcher.count,
    atCursor: matcher.atCursor,
    fromMode: matcher.fromMode,
  };
}

/**
 * Whether the cursor position at the time an action was issued matches an
 * `atCursor` requirement. The position is looked up from the `actionCursors`
 * WeakMap (stamped by dispatch), not stored on the Action object. The
 * requirement is 1-based (matching `config.cursor`); the recorded cursor is
 * 0-based (engine coordinates). `null` in either slot leaves that axis
 * unconstrained.
 */
function cursorMatchesAtCursor(action: Action, atCursor: CursorAtPosition): boolean {
  const cursor = actionCursors.get(action);
  if (!cursor) {
    return false;
  }
  const [line, column] = atCursor;
  return (
    (line === null || cursor.line === line - 1) && (column === null || cursor.col === column - 1)
  );
}

function actionMatchesMatcher(action: Action, matcher: ParsedCommandMatcher): boolean {
  return (
    isIssuedCommand(action) &&
    commandMatches(action.command!, matcher.command, matcher.exact) &&
    (matcher.count === undefined || action.count === matcher.count) &&
    (matcher.atCursor === undefined || cursorMatchesAtCursor(action, matcher.atCursor)) &&
    (matcher.fromMode === undefined || actionModes.get(action) === matcher.fromMode)
  );
}

function historyHasCommand(
  history: readonly Action[],
  matcher: CommandMatcher,
  fallbackExact = false,
  fallbackCount?: number,
  fallbackAtCursor?: CursorAtPosition
): boolean {
  const parsed = parseCommandMatcher(matcher, fallbackExact, fallbackCount, fallbackAtCursor);
  return history.some((action) => actionMatchesMatcher(action, parsed));
}

/** Whether a file counts as saved: written at least once, with no pending edits. */
function isSaved(target: LessonFileState): boolean {
  return target.written && !target.dirty;
}

function linePasses(test: LineTest, contents: readonly string[]): boolean {
  const line = contents[test.number - 1];

  if (line === undefined) {
    return false;
  }

  if (test.equals !== undefined && line !== test.equals) {
    return false;
  }

  if (test.contains !== undefined && !line.includes(test.contains)) {
    return false;
  }

  // The loader rejects an unparsable pattern, so this cannot throw here.
  if (test.matches !== undefined && !new RegExp(test.matches).test(line)) {
    return false;
  }

  return true;
}

function countOccurrences(test: OccurrenceTest, contents: readonly string[], text: string): number {
  if (test.exact) {
    return contents.filter((line) => line === test.needle).length;
  }

  const regex = parseNeedleRegex(test.needle);
  if (regex) {
    const flags = regex.flags.includes('g') ? regex.flags : `${regex.flags}g`;
    const matcher = new RegExp(regex.source, flags);
    let count = 0;

    while (matcher.exec(text) !== null) {
      count++;
    }

    return count;
  }

  let count = 0;
  let offset = 0;

  while (true) {
    const index = text.indexOf(test.needle, offset);
    if (index === -1) {
      return count;
    }

    count++;
    offset = index + Math.max(test.needle.length, 1);
  }
}

function quickfixPasses(test: QuickfixTest, context: ChecklistContext): boolean {
  const entries = context.quickfix?.entries;
  const count = entries?.length ?? 0;

  if (test.count !== undefined && count !== test.count) {
    return false;
  }

  if (test.minCount !== undefined && count < test.minCount) {
    return false;
  }

  if (test.contains !== undefined) {
    const needle = test.contains;
    if (!entries?.every((entry) => entry.text.includes(needle))) {
      return false;
    }
  }

  return true;
}

function registerPasses(test: RegisterTest, context: ChecklistContext): boolean {
  const text = context.register?.text;

  if (text === undefined) {
    return false;
  }

  if (test.equals !== undefined && text !== test.equals) {
    return false;
  }

  if (test.contains !== undefined && !text.includes(test.contains)) {
    return false;
  }

  if (test.matches !== undefined && !new RegExp(test.matches).test(text)) {
    return false;
  }

  return true;
}

/**
 * Whether a recorded action is a command the learner *issued*, as opposed to a
 * character they *typed*. Insert-mode keystrokes are recorded with `type:
 * 'insert'` (a typed "A" is `{ type: 'insert', command: 'A' }`), and matching
 * them would let typed text satisfy a normal-mode `command` item — pressing `A`
 * to type a capital A would tick a `{ command: "A" }` step that meant the
 * append-at-line-end command. `Enter` is the one carve-out: `splitAtCursor`
 * records it as an insert action, and it is the only insert-type key a lesson
 * legitimately asserts.
 */
function isIssuedCommand(action: Action): boolean {
  return action.command !== undefined && (action.type !== 'insert' || action.command === 'Enter');
}

function visitedPositionsContain(
  visitedPositions: ReadonlySet<string> | null,
  [line, column]: CursorAtPosition
): boolean {
  if (!visitedPositions) {
    return false;
  }

  if (line !== null && column !== null) {
    return visitedPositions.has(`${line - 1},${column - 1}`);
  }

  return [...visitedPositions].some((key) => {
    const [visitedLine, visitedColumn] = key.split(',').map(Number);

    return (
      (line === null || visitedLine === line - 1) &&
      (column === null || visitedColumn === column - 1)
    );
  });
}

interface TestResult {
  passed: boolean;
  count?: number;
  total?: number;
}

/** The session predicates: what the learner did, read off history and live position. */
function sessionPasses(test: LessonTest, context: ChecklistContext): TestResult {
  if (
    test.command !== undefined &&
    !historyHasCommand(
      context.history,
      test.command,
      test.exact === true,
      test.count,
      test.atCursor
    )
  ) {
    return { passed: false };
  }

  if (
    test.anyOfCommands !== undefined &&
    !test.anyOfCommands.some((matcher) => historyHasCommand(context.history, matcher))
  ) {
    return { passed: false };
  }

  if (test.open !== undefined && context.activeFilePath !== test.open) {
    return { passed: false };
  }

  if (test.cursorAt !== undefined) {
    const multiPosition = Array.isArray(test.cursorAt[0]);
    const positions: CursorAtPosition[] = multiPosition
      ? (test.cursorAt as CursorAtPosition[])
      : [test.cursorAt as CursorAtPosition];

    if (!multiPosition) {
      const [line, column] = positions[0];
      const matchesLine = line === null || context.cursor.line === line - 1;
      const matchesColumn = column === null || context.cursor.col === column - 1;

      return { passed: matchesLine && matchesColumn };
    }

    const count = positions.filter((position) =>
      visitedPositionsContain(context.visitedPositions, position)
    ).length;

    return { passed: count === positions.length, count, total: positions.length };
  }

  return { passed: true };
}

/** The state predicates: what is true now, read off the filesystem and session. */
function statePasses(test: LessonTest, context: ChecklistContext): boolean {
  if (test.quit !== undefined && test.quit !== context.inShell) {
    return false;
  }

  if (test.lineNumbers !== undefined && test.lineNumbers !== context.showLineNumbers) {
    return false;
  }

  if (test.register !== undefined && !registerPasses(test.register, context)) {
    return false;
  }

  if (test.quickfix !== undefined && !quickfixPasses(test.quickfix, context)) {
    return false;
  }

  if (test.files !== undefined) {
    return test.files.every((file) =>
      statePasses(
        {
          ...test,
          file,
          files: undefined,
          equals: test.equalsByFile?.[file] ?? test.equals,
          equalsByFile: undefined,
        },
        context
      )
    );
  }

  // The loader requires a `file` beside every predicate below, so a test without
  // one has nothing left to judge here.
  if (test.file === undefined) {
    return true;
  }

  const target = context.file(test.file);

  if (!target) {
    return false;
  }

  if (test.saved !== undefined && test.saved !== isSaved(target)) {
    return false;
  }

  // `matchAgainstSaved` reads the last written copy, so the item moves on `:w`
  // rather than on each keystroke. `saved` above is unaffected — it asks about
  // write state, not contents.
  const source = test.matchAgainstSaved ? target.saved : target.contents;
  const text = source.join('\n');

  if (test.equals !== undefined) {
    const expected = test.normalizeWhitespace ? normalizeWhitespace(test.equals) : test.equals;
    const actual = test.normalizeWhitespace ? normalizeWhitespace(text) : text;

    if (actual !== expected) {
      return false;
    }
  }

  if (test.notEquals !== undefined) {
    const expected = test.normalizeWhitespace
      ? normalizeWhitespace(test.notEquals)
      : test.notEquals;
    const actual = test.normalizeWhitespace ? normalizeWhitespace(text) : text;

    if (actual === expected) {
      return false;
    }
  }

  if (test.contains && !test.contains.every((needle) => matchNeedle(needle, text))) {
    return false;
  }

  if (test.matches !== undefined && !matchNeedle(test.matches, text)) {
    return false;
  }

  if (test.absent && test.absent.some((needle) => matchNeedle(needle, text))) {
    return false;
  }

  if (
    test.occurrences &&
    test.occurrences.some(
      (occurrence) => countOccurrences(occurrence, source, text) !== occurrence.count
    )
  ) {
    return false;
  }

  if (test.line && !linePasses(test.line, source)) {
    return false;
  }

  if (test.blank !== undefined && test.blank !== /^\s*$/.test(text)) {
    return false;
  }

  return true;
}

/** Whether one requirement's predicate holds against the current engine state. */
function testPasses(test: LessonTest, context: ChecklistContext): TestResult {
  const session = sessionPasses(test, context);

  return {
    ...session,
    passed: session.passed && statePasses(test, context),
  };
}

/**
 * Evaluate every checklist requirement against the current engine state,
 * returning one result per item (parallel to `config.checklist`).
 *
 * Each item is judged on its own, so each owns its checkmark and one file's
 * requirement never gates another's. Whether an item may latch is read off the
 * test itself rather than off the lesson: an item built purely from session
 * predicates asks whether the learner reached a waypoint and stays ticked once
 * they have, while anything asserting current state is re-checked on every
 * keystroke, since an edit can be undone and Vim can be reopened.
 */
export function evaluateChecklist(
  lesson: AuthoredLessonDefinition,
  context: ChecklistContext
): RequirementResult[] {
  return lesson.config.checklist.map((requirement) => {
    if (
      requirement.evaluateWhen?.fileOpen !== undefined &&
      context.activeFilePath !== requirement.evaluateWhen.fileOpen
    ) {
      return { passed: false, monotonic: isLatchingTest(requirement.test), deferred: true };
    }
    if (requirement.evaluateWhen?.fileChanged !== undefined) {
      const files =
        typeof requirement.evaluateWhen.fileChanged === 'string'
          ? [requirement.evaluateWhen.fileChanged]
          : requirement.evaluateWhen.fileChanged;
      const allChanged = files.every((file) => {
        const target = context.file(file);
        return target !== null && (target.dirty || target.written);
      });

      if (!allChanged) {
        return { passed: false, monotonic: isLatchingTest(requirement.test), deferred: true };
      }
    }
    if (requirement.evaluateWhen?.absent !== undefined) {
      const files =
        typeof requirement.evaluateWhen.fileChanged === 'string'
          ? [requirement.evaluateWhen.fileChanged]
          : (requirement.evaluateWhen.fileChanged ?? []);
      const needles =
        typeof requirement.evaluateWhen.absent === 'string'
          ? [requirement.evaluateWhen.absent]
          : requirement.evaluateWhen.absent;
      const allAbsent = files.every((file) => {
        const target = context.file(file);
        return (
          target !== null &&
          needles.every((needle) => !matchNeedle(needle, target.contents.join('\n')))
        );
      });

      if (!allAbsent) {
        return { passed: false, monotonic: isLatchingTest(requirement.test), deferred: true };
      }
    }
    if (
      requirement.evaluateWhen?.register !== undefined &&
      !registerPasses(requirement.evaluateWhen.register, context)
    ) {
      return { passed: false, monotonic: isLatchingTest(requirement.test), deferred: true };
    }
    if (context.quickfixListing && requirement.test.file !== undefined) {
      return { passed: false, monotonic: isLatchingTest(requirement.test), deferred: true };
    }

    const result = testPasses(requirement.test, context);

    return {
      ...result,
      monotonic: isLatchingTest(requirement.test),
    };
  });
}

/**
 * The guidance shown when a learner tries to advance before the lesson's
 * requirements hold. Each checklist item carries its own hint, so this returns
 * a single generic pointer rather than duplicating per-item guidance.
 */
export function describeIncomplete(): string {
  return "Some steps aren't done yet. Check the lesson requirements.";
}
