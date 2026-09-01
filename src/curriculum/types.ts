import type { DecorationRange } from './decorations';
import type { InstructionSegment } from './tabBlocks';
import type { Mode } from '@/engine';

/**
 * A lesson's pedagogical category, authored in frontmatter. This is a label: it
 * drives curriculum grouping and UI wording only. It never determines how a
 * lesson is validated — every checklist item says that for itself — nor whether a
 * lesson is interactive, which is decided by the presence of a `# --config--`
 * section.
 */
export type LessonType = 'intro' | 'learn' | 'practice' | 'review';

export type StartMode = 'file' | 'explore' | 'shell' | 'splash' | 'animation';

export type CursorPosition = [number, number];

/**
 * A cursor position to test against, 1-based to match `config.cursor`. `null`
 * in either slot means "any value on that axis", so `[3, null]` asserts row 3
 * at any column.
 */
export type CursorAtPosition = [line: number | null, column: number | null];

/**
 * A predicate over one line of a file, addressed by its 1-based number. All
 * present fields must hold. A number past the end of the file fails rather than
 * throwing.
 */
export interface LineTest {
  /** The 1-based line number to read. */
  number: number;
  /** The line, compared in full. */
  equals?: string;
  /** A substring the line must contain. */
  contains?: string;
  /** A regular expression source the line must match. */
  matches?: string;
}

/** A predicate over the unnamed register's text. All present fields must hold. */
export interface RegisterTest {
  equals?: string;
  notEquals?: string;
  contains?: string;
  matches?: string;
}

/** A predicate over the quickfix list built by `:vimgrep`/`:grep`. */
export interface QuickfixTest {
  /** The list must contain at least this many entries. */
  minCount?: number;
  /** The list must contain exactly this many entries. */
  count?: number;
  /** Every entry's matched line must contain this text. */
  contains?: string;
}

/** An exact occurrence count for a substring, line, or regular expression. */
export interface OccurrenceTest {
  needle: string;
  count: number;
  exact?: boolean;
}

/**
 * One command requirement matcher. A string is sugar for `{ command: "..." }`.
 *
 * A command written as a `/pattern/flags` literal (the same convention as a
 * `contains` needle) is matched as a regex against the whole recorded command
 * rather than by the exact-or-prefix rule, so a lesson can discriminate on flags —
 * `:%s/a/b/g` versus the `:%s/a//gn` count query — that the plain form cannot see.
 * The regex ignores `exact`. The loader compiles every such pattern at load.
 *
 * `exact` and `count` are per-matcher modifiers, so they can differ across
 * alternatives in `anyOfCommands`.
 * `fromMode` constrains the mode in which the command was issued.
 */
export type CommandMatcher =
  | string
  | {
      command: string;
      exact?: boolean;
      count?: number;
      commandAt?: CursorAtPosition;
      fromMode?: Mode;
    };

/**
 * The completion predicate for one checklist item. All present fields must hold
 * (logical AND), and a single item is free to mix the two families below — that
 * is the whole point of there being one test shape rather than two lesson modes.
 *
 * **Session predicates** (`command`, `exact`, `count`, `open`, `cursorAt`) ask
 * what the learner *did*: which keys reached the history,
 * which file they landed in, where the cursor got to. They are answered from a
 * record of the past, so they latch — see {@link isLatchingTest}.
 *
 * **State predicates** (`file` plus `equals`, `contains`, `absent`, `occurrences`, `line`,
 * `blank`, `saved`, and the session-wide `quit` and `lineNumbers`) ask what is *true now*:
 * how a file reads, whether it was written, whether Vim was left, whether the
 * gutter is on. A learner can always undo an edit or reopen Vim, so these are
 * re-read on every keystroke and never latch.
 *
 * Mixing the two is how a lesson asserts both the technique and the outcome:
 * "you used `x`" *and* "the file now reads this way" *and* "the other file is
 * still pristine".
 */
export interface LessonTest {
  /**
   * A command that must appear in the action history. Matching is count-agnostic
   * (`3dd` satisfies `dd`); a `:`-verb matches its argument form (`:%s` matches
   * `:%s/a/b/g`) but never a longer verb (`:w` never matches `:wq`); `Esc`
   * normalizes to the engine's `Escape`.
   *
   * This is an existence check, not a count check, and it says nothing about
   * where the cursor was or what the keystroke accomplished. Pair it with a state
   * predicate when the lesson is about producing an end state rather than about
   * the key itself.
   */
  command?: CommandMatcher;
  /**
   * Several equally-correct commands where any one satisfies the item. Each
   * entry is a {@link CommandMatcher}, so `exact` and `count` can target one
   * alternative without affecting the others.
   */
  anyOfCommands?: CommandMatcher[];
  /**
   * Require {@link command} to be what the learner typed, character for
   * character, instead of also accepting a longer form of it. Set this when the
   * lesson teaches one spelling among several that do the same thing: `:set
   * nonumber` then rejects the `:set nonu` and `:set number!` that would
   * otherwise be equivalent, and `:e` rejects `:e notes.md`.
   *
   * A modifier on `command`, not a predicate of its own — a test that sets it
   * without `command` is a config error. Count-agnosticism and the `Esc`/`Escape`
   * spelling are unaffected: those are how the engine records a keystroke, not
   * choices the learner made.
   */
  exact?: boolean;
  /**
   * Require {@link command} to have been typed with this numeric count, reading
   * `Action.count`. Set it when the count *is* the lesson: `{ command: "G", count:
   * 7 }` demands `7G` and rejects a bare `G`, which would otherwise satisfy
   * `command: "G"` on a seven-line file by landing on the last line for free.
   *
   * A modifier on `command`, like {@link exact} — a test setting it without
   * `command` is a config error, and it does not turn a session item live. Omit it
   * to keep the default count-agnostic matching, where any count (or none)
   * satisfies the command.
   */
  count?: number;
  /**
   * Require {@link command} to have been issued while the cursor was at this
   * position, reading `Action.cursor`. The check is atomic: the history entry
   * must match both the command and the position, so two independent `yy` steps
   * on different lines do not cross-satisfy each other.
   *
   * Uses `[line, column]` 1-based, matching `config.cursor`. `null` in either
   * slot leaves that axis unconstrained (`[3, null]` = any column on line 3).
   *
   * A modifier on `command`, like {@link exact} and {@link count} — a test
   * setting it without `command` is a config error, and it does not turn a
   * session item live.
   */
  commandAt?: CursorAtPosition;
  /**
   * The path that must be the active buffer. Satisfied by any route that leaves
   * that file open (`vim <file>`, `vim` then `:e <file>`), not a specific
   * keystroke sequence. Because it latches, it asserts the learner got there at
   * some point, not that they are still sitting in it — use `file` with a state
   * predicate to say something about a buffer they may have since left.
   */
  open?: string;
  /**
   * The 1-based position(s) the cursor must reach, matching `config.cursor`'s
   * convention. Accepts a single position or an array of positions.
   *
   * A single position (`[line, column]`) behaves like the former
   * `cursorLine`/`cursorColumn`: the item passes once the cursor reaches that
   * spot. Use `null` in either slot to leave that axis unconstrained.
   *
   * An array of positions (`[[l, c], ...]`) passes when every listed position
   * has been visited. The label may use `{count}` and `{total}` placeholders
   * for live progress.
   *
   * Because the item latches, this asserts the learner reached the position(s)
   * at some point, not that they are still there.
   */
  cursorAt?: CursorAtPosition | CursorAtPosition[];
  /**
   * The file every state predicate below reads. Required by all of them, with no
   * lesson-wide default to inherit: a test names its own subject, so that a
   * missing `file` is a loud config error rather than an assertion silently
   * pointed at the wrong path.
   *
   * Naming a file other than `config.open` is fully supported, and is how a
   * lesson proves the learner left a second file alone.
   */
  file?: string;
  /** Multiple files to which the same content predicates must all apply. */
  files?: string[];
  /**
   * Authoring marker: {@link file} is a path the learner creates during the
   * lesson, so the loader stops reading its absence from `# --files--` as a typo.
   * Nothing at runtime consults it.
   */
  newFile?: true;
  /**
   * The file's full contents, compared exactly (lines joined with `\n`).
   *
   * Authored either inline or, for anything longer than a line, as
   * `"equalsExpected": true`, which the loader resolves from the `# --expected--`
   * block named after this test's file. Both spellings land here, so nothing
   * downstream can tell them apart.
   *
   * Comparison is exact because that is the only way to assert a file reads a
   * specific way. Where the lesson does not really constrain the whole file,
   * prefer {@link contains}, {@link absent}, or {@link line}: an `equals` on a
   * file the learner may legitimately format differently rejects correct work.
   * The `"equalsExpectedNormalizingWhitespace": true` spelling also lands here,
   * but paired with {@link normalizeWhitespace} to relax the comparison — reach
   * for it when blank-line layout is the learner's business, not the lesson.
   */
  equals?: string;
  /** Loader-resolved expected contents when a test targets multiple files. */
  equalsByFile?: Record<string, string>;
  /** The file's full contents must differ from this exact text. */
  notEquals?: string;
  /**
   * Needles the file must all satisfy. Each is a plain substring, or a
   * `/pattern/flags` literal matched as a regex over the whole joined file text —
   * use the regex form to assert order across lines ("X after Y") that
   * {@link LineTest.matches} cannot express.
   */
  contains?: string[];
  /** A `/pattern/flags` regular expression that must match the entire file text. */
  matches?: string;
  /** Needles the file must not satisfy, in the same substring-or-`/regex/` form as {@link contains}. */
  absent?: string[];
  /** Exact occurrence counts for substrings, exact lines, or `/regex/flags` matches. */
  occurrences?: OccurrenceTest[];
  /** A predicate over one addressed line of the file. */
  line?: LineTest;
  /**
   * Whether the file's full contents must be blank — empty or nothing but
   * whitespace (`true`), or must carry some non-whitespace content (`false`).
   * Blank is `/^\s*$/` over the joined text, the same "empty or whitespace-only"
   * meaning as AssertJ's `isBlank` and Hamcrest's `blankString`.
   *
   * Use it for a lesson that empties a file, where `equals: ""` is too strict:
   * an emptied buffer the learner left a stray space or blank line in is still
   * blank, and the lesson is about the deletion, not exact whitespace. Redirect
   * it at the saved copy with {@link matchAgainstSaved} like the other content
   * predicates.
   */
  blank?: boolean;
  /**
   * Point the seven content predicates — `equals` (including the `equalsExpected`
   * spelling, which resolves into `equals` at load time), `contains`, `absent`,
   * `notEquals`, `occurrences`, and `line` — at the file's last written
   * contents (`LessonFileState.saved`)
   * instead of the live buffer. The item's checkmark then moves only when the
   * learner runs `:w`, in both directions, rather than flickering as they type.
   *
   * A modifier, not a predicate: a test that sets it without one of the seven
   * content predicates is a config error, and it needs `file` like they do. It
   * does not touch `saved`, `quit`, or any session predicate.
   *
   * Seed note authors need: `createVirtualFile` seeds a file's saved copy with its
   * seed text, so a `matchAgainstSaved` predicate that already holds against the seed
   * would tick before the learner does anything. The loader rejects that unless
   * the test also asserts `saved: true`.
   */
  matchAgainstSaved?: true;
  /**
   * Loader-set marker, never authored directly: the
   * `equalsExpectedNormalizingWhitespace` spelling resolves into {@link equals}
   * plus this flag. It relaxes the `equals` comparison to ignore insignificant
   * whitespace — blank (empty or whitespace-only) lines are dropped and trailing
   * whitespace is trimmed on each remaining line, on both the file and the
   * expected text, before comparing. Indentation and spacing between words stay
   * significant, so a joined or reindented line still fails.
   *
   * Use it for an edit lesson whose point is the rearranged content, not the exact
   * blank-line layout, so a learner is not failed for a missing or extra blank line
   * between sections. Keep plain `equals`/`equalsExpected` (exact) for a file the
   * learner must leave untouched or format precisely. Only ever accompanies
   * `equals`, so like {@link matchAgainstSaved} it is neutral for latching.
   */
  normalizeWhitespace?: true;
  /**
   * Whether the file must have been written and carry no unsaved changes
   * (`true`), or still be unwritten/modified (`false`). A pristine untouched file
   * fails `saved: true`, since clean is not the same as saved.
   */
  saved?: boolean;
  /**
   * Whether Vim must have been left for the terminal (`true`), or still be open
   * (`false`). Re-entering Vim with `vim` makes a `quit: true` item fail again.
   * A state predicate that asks about the session rather than a file, so it does
   * not need {@link file}.
   */
  quit?: boolean;
  /**
   * Whether the line-number gutter must be on (`true`) or off (`false`), read from
   * `state.showLineNumbers`. Live, so it asks about the display *now*: `:set
   * number` then `:set nonumber` leaves it off, and both an on-item and an
   * off-item read the end state rather than latching on whichever `:set` ran. Like
   * {@link quit}, it is session-wide and needs no {@link file}.
   */
  lineNumbers?: boolean;
  /**
   * A live, non-latching state predicate over the unnamed register's text.
   * All present fields must hold, using the same variants as {@link LineTest}.
   */
  register?: RegisterTest;
  /**
   * A live, non-latching state predicate over the quickfix list built by the
   * last `:vimgrep`/`:grep` run. Fails until the first such run (`null` list).
   * Like {@link quit} and {@link lineNumbers}, it is session-wide and needs no
   * {@link file}.
   */
  quickfix?: QuickfixTest;
}

/**
 * The session predicates: the fields answered from a record of what already
 * happened, and so the fields that may latch once true.
 */
const LATCHING_TEST_KEYS: readonly string[] = ['command', 'anyOfCommands', 'open', 'cursorAt'];

/**
 * Fields that assert nothing on their own: `file` names the subject of the state
 * predicates, `newFile` is an authoring marker, `exact` and `count` tighten
 * `command`, and `matchAgainstSaved` redirects the content predicates at the saved
 * copy, and `normalizeWhitespace` relaxes the `equals` comparison. None of them
 * can make an item live, so they are skipped when classifying it — otherwise
 * `file` alone would force every content item live *and* drag a latching sibling
 * predicate down with it. `matchAgainstSaved` cannot latch either: it only appears
 * beside a live content predicate, and a learner can save a second time and un-tick
 * it.
 */
const NEUTRAL_TEST_KEYS: readonly string[] = [
  'file',
  'newFile',
  'exact',
  'count',
  'commandAt',
  'matchAgainstSaved',
  'normalizeWhitespace',
];

/**
 * Whether an item may be latched once it passes, rather than re-checked on every
 * keystroke.
 *
 * An item latches only when *every* predicate it asserts is a session predicate.
 * One state predicate makes the whole item live, since latching it would freeze a
 * checkmark on something that has since stopped being true.
 */
export function isLatchingTest(test: LessonTest): boolean {
  return Object.keys(test)
    .filter((key) => !NEUTRAL_TEST_KEYS.includes(key))
    .every((key) => LATCHING_TEST_KEYS.includes(key));
}

/**
 * A condition that must hold before a checklist item is evaluated at all. When the
 * condition is not met, the item stays in its current state and an attempt does not
 * reveal its hint — the learner is still in a prerequisite phase (e.g. opening a
 * file from the shell) and has not yet reached the step.
 */
export interface EvaluateWhen {
  /** The file that must be the active buffer before this item is evaluated. */
  fileOpen?: string;
  /** The file or files must have been edited or written before this item is evaluated. */
  fileChanged?: string | string[];
  /** Needles that must be absent from the changed file before evaluation begins. */
  absent?: string | string[];
  /** An optional register state that must be present before this item is evaluated. */
  register?: RegisterTest;
}

/**
 * One checklist item: display label, an optional learner-facing hint revealed on
 * demand, and its completion predicate. Every item carries its own `test` and is
 * judged on its own, with its own checkmark; one item's requirement never gates
 * another's.
 */
export interface ChecklistRequirement {
  label: string;
  hint?: string;
  /**
   * When true, the item's hint is shown even when the checklist just advanced to
   * it (i.e. the previous item completed on the same keystroke). Normally hints are
   * suppressed on advance because the keystroke was a success for the prior item,
   * not a miss for the new one. Use this on a trailing content-equality test that
   * always co-fires with its predecessor (e.g. a save test), so the learner sees
   * the hint immediately when the content is wrong.
   */
  hintOnAdvance?: boolean;
  /** Number of failed, debounced target-line attempts before showing the hint. */
  attemptsBeforeHint?: number;
  /** The line substring or regex watched for debounced attempts. */
  targetLine?: string;
  /**
   * When present, the item's test is not evaluated (and attempts do not reveal its
   * hint) until this condition holds. Use it for a `start: 'shell'` lesson whose
   * first items test file state the learner cannot reach before opening the editor.
   */
  evaluateWhen?: EvaluateWhen;
  test: LessonTest;
}

/**
 * A per-command usage cap, authored under {@link LessonConfig.commandLimits}. A
 * bare number is shorthand for `{ times: N }`; the object form carries either or
 * both knobs:
 *
 * - `times` — how many times the command may be *invoked* (executed). It counts
 *   invocations, not units affected, so `3dd` is one use, not three. Pair it with
 *   `maxCount` when a large single sweep would defeat the lesson.
 * - `maxCount` — the largest count prefix any single invocation may carry, so
 *   `{ maxCount: 1 }` forces one unit at a time. Inert for commands that do not
 *   honor a count in this engine (e.g. `x`), which always run with count 1.
 *
 * The loader rejects an empty object, non-positive or non-integer values, and
 * `@`-group keys (a cap is per command; a group cap would be ambiguous).
 */
export type CommandLimit = number | { times?: number; maxCount?: number };

/**
 * A range of lines in a seed file that is decorative ASCII art. When
 * `description` is set, consecutive lines in the range are wrapped in a single
 * `role="img"` container with `aria-label`; without it, each line gets
 * `aria-hidden="true"` and is excluded from the screen reader's list count.
 */
export interface DecorativeRange {
  file: string;
  /** 1-based inclusive start and end line numbers. */
  lines: [number, number];
  /** When provided, the range is announced as a described image. */
  description?: string;
  /**
   * A needle (plain substring or `/pattern/flags` regex) tested against every
   * buffer line within the range on each render. The range is applied while at
   * least one line matches; when none do (the drawing was fully deleted or
   * shifted away), the range is silently skipped so surviving content is not
   * mislabeled.
   */
  anchor?: string;
}

export interface LessonConfig {
  start: StartMode;
  /**
   * Full unsupported-command message template. Use `{sequence}` for the
   * command and `{mode}` for the mode-specific variant.
   */
  unsupportedMessage?: string;
  /**
   * The file open in the editor at seed time. Optional when `# --files--` seeds
   * exactly one file, which is then the target by default; required for
   * multi-file lessons, where there is nothing to infer from. It is the starting
   * buffer only — checklist tests name the files they read for themselves.
   *
   * A `start: 'splash'` or `start: 'shell'` lesson opens no file at seed time, so
   * `open` is meaningless there: it must not be declared and resolves to `''`
   * regardless of how many files are seeded. (`'splash'` sets `activeFilePath` to
   * `''`; a cold `'shell'` overwrites it on every route out.)
   */
  open: string;
  cursor: CursorPosition;
  /**
   * The commands the learner may run; every other command is refused with a
   * `filtered` action and a status-line error. Omit it to allow everything (a lab).
   *
   * Each entry is matched against the *resolved* command, exactly as a checklist
   * `command` is: `:w` permits `:w` and `:w foo` but not `:wq`, a single key permits
   * only itself. A bare `:` or `/` is a family wildcard (any ex command, any
   * search). An `@`-prefixed entry (`"@navigation"`) expands at load time to a group
   * from `commandGroups.ts` and may mix with raw commands.
   *
   * Because the filter judges the completed command, not its leading key, entering
   * command-line or search mode (`:`, `/`) is always permitted — the command typed
   * there is judged when it runs. It cannot force one specific ex command on its
   * own if the learner could reach the state another way; assert that with the
   * checklist.
   */
  allowedCommands?: string[];
  /**
   * Commands the learner may *not* run, with everything else allowed — the inverse
   * of {@link allowedCommands}, for a lesson that opens up the whole editor except a
   * few keys. Matched the same way, entry for entry, so `[":q"]` forbids only `:q`
   * and leaves `:w`, `:wq`, and the rest working. When both lists are present, the
   * allow list restricts first and the deny list subtracts from what it left.
   */
  disallowedCommands?: string[];
  /**
   * Per-command usage caps, layered on top of the allow/deny lists — a capped
   * command need not appear in {@link allowedCommands}, and a cap only ever
   * further restricts. Keys are matched exactly as an `allowedCommands` entry is
   * (a single key, a `:`-verb, or the `:`/`/` family wildcard); `@`-group keys are
   * rejected at load. A key may also be a `/pattern/flags` regex literal, matched
   * against the whole recorded command, for a cap that must discriminate on flags a
   * bare verb cannot see: `"/^:%s\/.*\/.*\/(?!.*n)[gi]*$/": 3` caps substituting
   * `:%s` runs while leaving the `:%s/…//gn` count query uncapped. Each value is a
   * {@link CommandLimit}: a number caps invocations, the object form adds a
   * per-invocation `maxCount`. An over-cap command is refused with a `filtered`
   * action and a status-line message, exactly like a disallowed one but explaining
   * why.
   */
  commandLimits?: Record<string, CommandLimit>;
  /**
   * When true, every buffer cell the cursor has occupied is rendered with a
   * "visited" highlight (green text), so the learner sees a trail of where the
   * cursor has been. Useful for letter-tracing exercises where the learner
   * navigates a shape and needs to see which positions remain.
   */
  highlightVisited?: boolean;
  /**
   * Terrain rules for maze-style lessons. Each entry maps a single-character
   * glyph to the commands that may cross it; all other commands are blocked.
   * Omit it for normal file-editing lessons.
   */
  terrain?: { glyph: string; passableBy: string[] }[];
  /**
   * The animation scene to play when `start` is `'animation'`. Names a
   * registered scene in the scene registry. Required with `start: 'animation'`,
   * forbidden otherwise.
   */
  scene?: string;
  /**
   * The animation scene to play once all checklist requirements pass.
   * Dismissing it returns to {@link open}.
   */
  completionScene?: string;
  checklist: ChecklistRequirement[];
  /**
   * Ranges of lines in seed files that are decorative ASCII art. Each range is
   * hidden from screen readers or, when a `description` is provided, exposed as
   * a single described image. Lines within a range that the learner must edit
   * should NOT be listed here — leave them as normal content listitems.
   *
   * When the learner's edits shift or delete the drawing, an `anchor` needle
   * keeps the label from misfiring: the range is applied only while at least
   * one buffer line within the range matches the anchor.
   *
   * Validated at load time against seed content: the named file must exist, and
   * the line range must fall within the file's line count.
   */
  decorativeRanges?: DecorativeRange[];
}

/**
 * The fields every lesson carries. `module` and `lesson` are both derived from
 * `ordering.ts` — `module` is the module number, `lesson` is the 1-based position
 * within the module.
 */
interface LessonIdentity {
  id: string;
  module: number;
  lesson: number;
  type: LessonType;
  title: string;
  wip?: boolean;
}

/**
 * A prose-only lesson (module intro, module review, cheatsheet page). It carries
 * no `# --config--` section, and so no files, checklist, or engine state.
 *
 * When the instructions contain `:::tabs` blocks, `instructionSegments` holds
 * the parsed interleaving of markdown and tab-group data. When absent, the
 * instructions are plain markdown with no embedded tab groups.
 */
export interface ProseLessonDefinition extends LessonIdentity {
  instructions: string;
  instructionSegments?: InstructionSegment[];
  config?: never;
  files?: never;
}

/**
 * A hands-on lesson driven by the engine: it inlines starter files and
 * instructions.
 *
 * Content assertions live on the checklist's tests. A lesson's `# --expected--`
 * blocks are authoring convenience for long strings and are resolved into
 * `LessonTest.equals` at load time, so no lesson carries them as a section of its
 * own.
 */
export interface AuthoredLessonDefinition extends LessonIdentity {
  instructions: string;
  files: Record<string, string>;
  /** Per-file decoration ranges extracted from `${...}` markers in `# --files--`. */
  fileDecorations?: Record<string, DecorationRange[]>;
  config: LessonConfig;
}

export type LessonDefinition = AuthoredLessonDefinition | ProseLessonDefinition;

/**
 * Narrow to a prose-only lesson. Interactivity is decided by whether the
 * markdown declared a `# --config--` section, never by `type` — a `review`
 * lesson is free to carry an exercise.
 */
export function isProseLesson(lesson: LessonDefinition): lesson is ProseLessonDefinition {
  return lesson.config === undefined;
}

/** Narrow to a lesson that carries files, a checklist, and engine state. */
export function isAuthoredLesson(lesson: LessonDefinition): lesson is AuthoredLessonDefinition {
  return lesson.config !== undefined;
}

export interface ModuleDefinition {
  module: number;
  slug: string;
  title: string;
  lessonIds: string[];
  wip: boolean;
}
