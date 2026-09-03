import { type EditorState } from '@/engine';
import { vimLessonEngine, type AllowedInput } from './lessonEngine';
import {
  type AuthoredLessonDefinition,
  type EvaluateWhen,
  type LessonTest,
} from './types';

/** Identify a lesson in assertion messages by position and title, not opaque UUID. */
export function name(lesson: AuthoredLessonDefinition): string {
  return `${lesson.module}.${lesson.lesson} "${lesson.title}"`;
}

/**
 * A lesson whose start mode opens no file (splash, shell), so `config.open` is ''
 * by design and there is no starting buffer to validate open/cursor against.
 */
export function opensNoFile(lesson: AuthoredLessonDefinition): boolean {
  return lesson.config.start === 'splash' || lesson.config.start === 'shell';
}

export function toLines(body: string): string[] {
  return body.split('\n');
}

export function commandText(test: LessonTest): string | undefined {
  if (test.command !== undefined) {
    return typeof test.command === 'string' ? test.command : test.command.command;
  }

  const entries = test.anyOfCommands;

  if (entries === undefined || entries.length === 0) {
    return undefined;
  }

  // Any alternative satisfies the item, so drive one this harness can synthesize:
  // `commandToKeys` cannot emit a count prefix, so prefer an entry without a
  // `count` before falling back to the first.
  const synthesizable =
    entries.find((entry) => typeof entry === 'string' || entry.count === undefined) ?? entries[0];

  return typeof synthesizable === 'string' ? synthesizable : synthesizable.command;
}

/** Feed a run of keys through the engine, honoring the lesson's input filter. */
export function feedKeys(
  state: EditorState,
  keys: readonly string[],
  allowed?: AllowedInput
): EditorState {
  return keys.reduce((current, key) => vimLessonEngine.feed(current, key, allowed).state, state);
}

export const ARROW_NAMES: Record<string, string> = {
  Down: 'ArrowDown',
  Up: 'ArrowUp',
  Left: 'ArrowLeft',
  Right: 'ArrowRight',
};

/**
 * Expand a requirement into the keys that satisfy it, the way a learner would type
 * them. A `:`-verb paired with an `open` target gets that path as its argument
 * (`:e` + `styles.css` → `:e styles.css`), since the test's own `open` field says
 * which file the command is meant to act on. `r` consumes the next key as its
 * replacement, so it is given one (`rChar`, defaulting to `'x'`). Shell commands
 * (`vim`, `vim <path>`) and command-line commands both buffer until `Enter`, so
 * they get one.
 */
export function commandToKeys(command: string, open?: string, rChar?: string): string[] {
  if (command === 'Esc' || command === 'Escape') {
    return ['Escape'];
  }
  if (command in ARROW_NAMES) {
    return [ARROW_NAMES[command]];
  }
  if (command === 'Ctrl-r') {
    return ['Ctrl-r', '"'];
  }
  if (command.startsWith('Ctrl-')) {
    return [command];
  }
  if (command === 'r') {
    return ['r', rChar ?? 'x'];
  }

  if (command.startsWith(':') || command.startsWith('/')) {
    const argument = open !== undefined ? ` ${open}` : '';
    return [...`${command}${argument}`, 'Enter'];
  }

  if (command === 'vim' || command.startsWith('vim ')) {
    return [...command, 'Enter'];
  }

  return [...command];
}

/**
 * Whether a test's pass/fail depends on file content that `satisfy` cannot produce.
 * Items with these fields are checked by the "declared end states" test instead.
 */
export function hasContentAssertion(test: LessonTest): boolean {
  return (
    test.equals !== undefined ||
    test.notEquals !== undefined ||
    test.contains !== undefined ||
    test.absent !== undefined ||
    test.line !== undefined ||
    test.blank !== undefined ||
    test.register !== undefined
  );
}

/**
 * Whether `satisfy` has something actionable to drive for this test: a command to
 * type, or a state predicate (saved/quit) whose implied command it can synthesize.
 * Items with none of these are pure navigation or content waypoints that `satisfy`
 * cannot derive keystrokes for.
 */
export function isDrivable(test: LessonTest): boolean {
  return (
    commandText(test) !== undefined ||
    test.saved === true ||
    test.quit === true ||
    test.quickfix !== undefined
  );
}

/**
 * Whether the cursor has reached a target position. `cursorReached` values are
 * 1-based; the engine's cursor is 0-based. A `null` component is a wildcard:
 * `[5, null]` matches any column on line 5.
 */
export function cursorReached(state: EditorState, row: number | null, col: number | null): boolean {
  return (
    (row === null || state.cursor.line === row - 1) &&
    (col === null || state.cursor.col === col - 1)
  );
}

/**
 * Move the netrw selection onto a path and open it. The listing is the seeded file
 * paths sorted, and the initial selection is unspecified, so clamp to the top with
 * `k` before stepping down — the same approach the capstone walkthrough uses.
 */
export function openFromExplorer(
  state: EditorState,
  lesson: AuthoredLessonDefinition,
  path: string
): EditorState {
  const listing = Object.keys(lesson.files).sort();
  const index = listing.indexOf(path);

  if (index < 0) {
    return state;
  }

  const toTop = Array.from({ length: listing.length }, () => 'k');
  const down = Array.from({ length: index }, () => 'j');

  return feedKeys(state, [...toTop, ...down, 'Enter']);
}

/**
 * Infer the character that `r` should replace the character under the cursor
 * with, by comparing the test's `contains` and `absent` assertions for a
 * single-character diff, then falling back to the `equals` field, then to `'x'`.
 *
 * Example: `absent: ["carriagg"]` + `contains: ["carriage"]` → `'e'` at the
 * position where the two strings differ.
 */
export function deriveReplacementChar(test: LessonTest, state: EditorState): string {
  const cursorCol = state.cursor.col;

  if (test.contains !== undefined && test.absent !== undefined) {
    for (const needle of test.contains) {
      for (const anti of test.absent) {
        if (typeof needle !== 'string' || typeof anti !== 'string') {
          continue;
        }
        if (needle.length !== anti.length) {
          continue;
        }
        let diffIdx = -1;
        let diffs = 0;
        for (let i = 0; i < needle.length; i++) {
          if (needle[i] !== anti[i]) {
            diffIdx = i;
            diffs++;
          }
        }
        if (diffs === 1 && diffIdx >= 0) {
          return needle[diffIdx];
        }
      }
    }
  }

  if (test.equals !== undefined) {
    const expectedLines = test.equals.split('\n');
    const expectedChar = expectedLines[state.cursor.line]?.[cursorCol];
    if (expectedChar !== undefined) {
      return expectedChar;
    }
  }

  return 'x';
}

/**
 * Drive a lesson to satisfy one checklist requirement, returning the advanced
 * state. A `command` requirement types that command. Content requirements need
 * text no derivation can produce and are checked separately, by construction.
 *
 * Commands normally act from normal mode, so an insert-entering command (`i`, `a`,
 * `o`) is followed out of insert mode before the next requirement is driven —
 * otherwise the next command's keys would be typed as literal text. Mode-specific
 * commands prepare their required mode first.
 *
 * `options.rChar` overrides the replacement character fed after `r`, so the
 * playthrough can supply the exact character rather than falling back to `'x'`.
 */
export function satisfy(
  state: EditorState,
  lesson: AuthoredLessonDefinition,
  test: LessonTest,
  allowed?: AllowedInput,
  evaluateWhen?: EvaluateWhen,
  options?: { rChar?: string }
): EditorState {
  let next = state;
  const command = commandText(test);

  // Navigate to the file required by an evaluateWhen gate before driving the
  // command, so the deferred-evaluation condition is met when requirements are
  // checked afterward.
  const evaluateFile = evaluateWhen?.fileOpen;
  if (evaluateFile && next.activeFilePath !== evaluateFile) {
    if (next.mode === 'shell') {
      next = feedKeys(next, commandToKeys(`vim ${evaluateFile}`), allowed);
    } else if (next.mode === 'explorer') {
      next = openFromExplorer(next, lesson, evaluateFile);
    } else {
      next = feedKeys(next, commandToKeys(':e', evaluateFile), allowed);
    }
  }

  // Shell-start lessons begin outside Vim. Enter the editor when the requirement
  // needs to operate inside it.
  if (next.mode === 'shell') {
    const target = test.open ?? test.file ?? lesson.config.open;
    if (target && (command !== undefined || test.open !== undefined || test.saved === true)) {
      next = feedKeys(next, commandToKeys(`vim ${target}`), allowed);
    }
  }

  // `Esc` only records in the action history when it transitions out of a
  // non-normal mode. If the engine is already in normal mode (because the prior
  // content edit was skipped), step into insert mode first so the Escape has an
  // observable effect.
  if ((command === 'Esc' || command === 'Escape') && next.mode === 'normal') {
    next = feedKeys(next, ['i'], allowed);
  }

  // A requirement naming an `open` target is satisfied by reaching that file, which
  // may be the whole requirement (no `command` at all) or the point of the command.
  const needsOpen = test.open !== undefined && next.activeFilePath !== test.open;
  const opensByCommand = command === undefined || command.startsWith(':');
  let opened = false;

  if (needsOpen && (next.mode === 'explorer' || opensByCommand)) {
    next =
      // In the file browser, `Enter` opens whatever is selected, so the selection
      // has to be moved onto the target first.
      next.mode === 'explorer'
        ? openFromExplorer(next, lesson, test.open!)
        : feedKeys(next, commandToKeys(command ?? ':e', test.open), allowed);
    opened = true;
  }

  if (command !== undefined && !opened) {
    const fromMode = typeof test.command === 'object' ? test.command.fromMode : undefined;
    if (fromMode === 'visual' && next.mode !== 'visual') {
      next = feedKeys(next, ['v'], allowed);
    }
    if (fromMode === 'command-line' && next.mode !== 'command-line') {
      next = feedKeys(next, [':'], allowed);
    }

    // `commandAt` is a precondition: the cursor must be at the target position
    // *before* the command runs, so move there first. The position may be
    // declared at the top-level test or embedded in the command matcher (where
    // it doubles as the engine's history constraint).
    const matcherCommandAt = typeof test.command === 'object' ? test.command.commandAt : undefined;
    const commandAt = test.commandAt ?? matcherCommandAt;
    if (commandAt !== undefined) {
      const [targetLine, targetCol] = commandAt;
      if (targetLine !== null) {
        let limit = 500;
        while (!cursorReached(next, targetLine, null) && --limit > 0) {
          const dir = next.cursor.line < targetLine - 1 ? 'j' : 'k';
          next = feedKeys(next, [dir], allowed);
        }
      }
      if (targetCol !== null) {
        let limit = 500;
        while (!cursorReached(next, null, targetCol) && --limit > 0) {
          const dir = next.cursor.col < targetCol - 1 ? 'l' : 'h';
          next = feedKeys(next, [dir], allowed);
        }
      }
    }

    const countKeys = test.count !== undefined ? [...String(test.count)] : [];
    const keys = [...countKeys, ...commandToKeys(command, test.open, options?.rChar)];

    // When a `cursorReached` postcondition targets a single position, repeat the
    // command until the cursor arrives there (capped to avoid infinite loops).
    const singleCursorAt =
      test.cursorReached !== undefined && !Array.isArray(test.cursorReached[0])
        ? (test.cursorReached as [number | null, number | null])
        : undefined;

    if (singleCursorAt !== undefined) {
      // Feed at least once (the command must register in the action history),
      // then repeat if the cursor hasn't reached the target yet.
      let limit = 500;
      do {
        next = feedKeys(next, keys, allowed);
      } while (!cursorReached(next, singleCursorAt[0], singleCursorAt[1]) && --limit > 0);
    } else {
      next = feedKeys(next, keys, allowed);
    }
  }

  // State predicates that imply a command the learner would type but that the
  // test expresses as a postcondition rather than a command field.
  if (command === undefined && !opened) {
    // Switch to the target file when saving a non-active buffer.
    if (test.file !== undefined && next.activeFilePath !== test.file && test.saved === true) {
      next = feedKeys(next, commandToKeys(':e', test.file), allowed);
    }
    if (test.saved === true) {
      next = feedKeys(next, commandToKeys(':w'), allowed);
    }
    if (test.quit === true) {
      next = feedKeys(next, commandToKeys(':q'), allowed);
    }
    // A quickfix predicate with `contains` implies a :vimgrep the learner would
    // type. Synthesize the command from the search pattern; `*` matches every
    // seeded file in the virtual filesystem.
    if (test.quickfix?.contains) {
      if (next.mode === 'shell') {
        const target = test.file ?? lesson.config.open;
        if (target) {
          next = feedKeys(next, commandToKeys(`vim ${target}`), allowed);
        }
      }
      next = feedKeys(next, commandToKeys(`:vimgrep /${test.quickfix.contains}/ *`), allowed);
    }
  }

  if (next.mode === 'insert') {
    next = feedKeys(next, ['Escape'], allowed);
  }

  return next;
}

/**
 * The end state a lesson declares per file, read off its checklist: every test's
 * `equals`, whether authored inline or resolved from a `# --expected--` block,
 * which the loader has already folded into `equals`. Empty for a lesson that only
 * checks keystrokes, or whose content tests are all narrower than a whole file.
 */
export function declaredEndState(lesson: AuthoredLessonDefinition): Record<string, string> {
  return Object.fromEntries(
    lesson.config.checklist
      .filter((requirement) => requirement.test.equals !== undefined)
      .map((requirement) => [requirement.test.file!, requirement.test.equals!])
  );
}
