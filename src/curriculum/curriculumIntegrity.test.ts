import { describe, expect, it } from 'vitest';
import { enterShell, setVirtualFile, type EditorState } from '@/engine';
import { loadFullCurriculum } from './loader';
import { vimLessonEngine, type AllowedInput } from './lessonEngine';
import {
  isProseLesson,
  type AuthoredLessonDefinition,
  type EvaluateWhen,
  type LessonTest,
} from './types';

/**
 * Integrity checks against the **real** authored curriculum, not fixtures. These
 * catch the class of bug a schema can't: a lesson whose seed no longer holds the
 * word its instructions tell the learner to change, an `expected` string with a
 * typo, a checklist item whose command the lesson's own `allowedCommands` filters
 * out, a command the engine never implemented.
 *
 * Everything is derived from each lesson's own config — the commands to type come
 * from the checklist, the target text from its `equals` — so there is no separate
 * solution file to author and keep in sync.
 *
 * Uses `loadFullCurriculum` so every non-WIP lesson is checked regardless of the
 * visibility flag. WIP lessons (flagged in `ordering.ts`) drop out of `authored`
 * below regardless of whether they have a config section — they are exempt from
 * these checks until finished and unflagged.
 */
const { lessons } = loadFullCurriculum();
const authored = lessons.filter(
  (lesson): lesson is AuthoredLessonDefinition => !isProseLesson(lesson) && !lesson.wip
);

/**
 * Requirements the playthrough cannot judge, each with the reason. Keyed by
 * `"<module>.<lesson> <label>"`. Anything failing that is **not** listed here is a
 * regression and fails the suite.
 *
 * Two distinct kinds, deliberately not merged:
 *
 * 1. **Engine gaps** — the lesson teaches a command the engine never implemented,
 *    so a learner cannot complete it either. These are product bugs, not test
 *    limitations, and the entry should be deleted once the command ships.
 * 2. **Derivation gaps** — the command needs an argument the config does not carry
 *    (`:%s` needs its pattern and replacement), so no amount of config-reading
 *    produces the keystrokes. These need a different kind of check, not a fix.
 */
const KNOWN_UNPLAYABLE = new Map<string, string>();

/** Identify a lesson in assertion messages by position and title, not opaque UUID. */
function name(lesson: AuthoredLessonDefinition): string {
  return `${lesson.module}.${lesson.lesson} "${lesson.title}"`;
}

/**
 * A lesson whose start mode opens no file (splash, shell), so `config.open` is ''
 * by design and there is no starting buffer to validate open/cursor against.
 */
function opensNoFile(lesson: AuthoredLessonDefinition): boolean {
  return lesson.config.start === 'splash' || lesson.config.start === 'shell';
}

function toLines(body: string): string[] {
  return body.split('\n');
}

function commandText(test: LessonTest): string | undefined {
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
function feedKeys(
  state: EditorState,
  keys: readonly string[],
  allowed?: AllowedInput
): EditorState {
  return keys.reduce((current, key) => vimLessonEngine.feed(current, key, allowed).state, state);
}

const ARROW_NAMES: Record<string, string> = {
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
 * replacement, so it is given one. Shell commands (`vim`, `vim <path>`) and
 * command-line commands both buffer until `Enter`, so they get one.
 */
function commandToKeys(command: string, open?: string): string[] {
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
    return ['r', 'x'];
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
function hasContentAssertion(test: LessonTest): boolean {
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
function isDrivable(test: LessonTest): boolean {
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
function cursorReached(state: EditorState, row: number | null, col: number | null): boolean {
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
function openFromExplorer(
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
 * Drive a lesson to satisfy one checklist requirement, returning the advanced
 * state. A `command` requirement types that command. Content requirements need
 * text no derivation can produce and are checked separately, by construction.
 *
 * Commands normally act from normal mode, so an insert-entering command (`i`, `a`,
 * `o`) is followed out of insert mode before the next requirement is driven —
 * otherwise the next command's keys would be typed as literal text. Mode-specific
 * commands prepare their required mode first.
 */
function satisfy(
  state: EditorState,
  lesson: AuthoredLessonDefinition,
  test: LessonTest,
  allowed?: AllowedInput,
  evaluateWhen?: EvaluateWhen
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
    const keys = [...countKeys, ...commandToKeys(command, test.open)];

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

describe('curriculum integrity', () => {
  it('should load authored lessons from real content', () => {
    expect(authored.length).toBeGreaterThan(0);
  });

  it('should start every checklist hint with "You can" or "You should"', () => {
    const broken = authored.flatMap((lesson) =>
      lesson.config.checklist.flatMap((requirement) => {
        const hint = requirement.hint;

        return hint !== undefined && !/^You (?:can|should)\b/.test(hint)
          ? [`${name(lesson)} item "${requirement.label}" has hint "${hint}"`]
          : [];
      })
    );

    expect(broken.join('\n')).toBe('');
  });

  it('should open a file that exists in its own seed', () => {
    const broken = authored
      // Openless modes (splash, shell) open no file, so config.open is '' by design.
      .filter((lesson) => !opensNoFile(lesson) && !(lesson.config.open in lesson.files))
      .map(
        (lesson) =>
          `${name(lesson)} opens ${lesson.config.open}, seeded: ${Object.keys(lesson.files).join(', ')}`
      );

    expect(broken.join('\n')).toBe('');
  });

  it('should place the starting cursor on a line that exists', () => {
    const broken = authored
      // Openless modes have no open buffer to place the cursor in; the cursor is
      // applied to whatever file the learner opens, so there is nothing to check here.
      .filter((lesson) => {
        if (opensNoFile(lesson)) {
          return false;
        }
        const lines = toLines(lesson.files[lesson.config.open] ?? '');
        return lesson.config.cursor[0] < 1 || lesson.config.cursor[0] > lines.length;
      })
      .map(
        (lesson) =>
          `${name(lesson)} starts at line ${lesson.config.cursor[0]} of ${lesson.config.open}`
      );

    expect(broken.join('\n')).toBe('');
  });
});

describe('curriculum keystroke requirements', () => {
  it('should complete every keystroke requirement when its own commands are typed', () => {
    const broken: string[] = [];
    const unexpectedlyFine: string[] = [];

    for (const lesson of authored) {
      const allowed = vimLessonEngine.allowedInput(lesson);
      let state = vimLessonEngine.seed(lesson);

      // Track which items pass at any point during the drive. Single-position
      // `cursorReached` checks the **current** cursor, so a later item can overwrite
      // an earlier item's position. Checking after every step catches the moment
      // each item's postcondition holds.
      const everPassed = new Set<number>();

      // Requirements are driven in listed order, which is the order the instructions
      // teach them in and the order a learner would work through.
      for (const requirement of lesson.config.checklist) {
        state = satisfy(state, lesson, requirement.test, allowed, requirement.evaluateWhen);
        vimLessonEngine.checkRequirements(state, lesson).forEach((result, i) => {
          if (result.passed) {
            everPassed.add(i);
          }
        });
      }

      const results = vimLessonEngine.checkRequirements(state, lesson);

      /**
       * Retry one requirement alone, from a fresh seed. Driving the list in order can
       * make a later item unreachable through no fault of the lesson — `ciw` after
       * `diw` already deleted the word, for instance. A requirement counts as
       * reachable if it is satisfiable in sequence *or* on its own; only one that
       * fails both ways is a real problem.
       */
      const passesAlone = (test: LessonTest, index: number): boolean => {
        const req = lesson.config.checklist[index];
        const alone = satisfy(
          vimLessonEngine.seed(lesson),
          lesson,
          test,
          allowed,
          req.evaluateWhen
        );
        return vimLessonEngine.checkRequirements(alone, lesson)[index].passed;
      };

      lesson.config.checklist.forEach((requirement, index) => {
        // Content requirements (equals, contains, absent, line, blank, register) are
        // checked by the "declared end states" tests, not here. Items with nothing
        // actionable for satisfy() (pure cursorReached waypoints) are also out of scope.
        if (hasContentAssertion(requirement.test) || !isDrivable(requirement.test)) {
          return;
        }

        const key = `${lesson.module}.${lesson.lesson} ${requirement.label}`;
        const known = KNOWN_UNPLAYABLE.get(key);

        if (
          results[index].passed ||
          everPassed.has(index) ||
          passesAlone(requirement.test, index)
        ) {
          // A listed gap that now passes means the gap closed; drop its entry so the
          // list cannot rot into a permanent excuse.
          if (known) {
            unexpectedlyFine.push(
              `${key} now passes (listed as: ${known}) — remove it from KNOWN_UNPLAYABLE`
            );
          }
          return;
        }

        if (!known) {
          broken.push(`${name(lesson)} item ${index + 1} "${requirement.label}" never completed`);
        }
      });
    }

    expect([...broken, ...unexpectedlyFine].join('\n')).toBe('');
  });

  it('should not be already complete on load', () => {
    const broken = authored
      .filter((lesson) =>
        vimLessonEngine
          .checkRequirements(vimLessonEngine.seed(lesson), lesson)
          .every((result) => result.passed)
      )
      .map(
        (lesson) => `${name(lesson)} passes every requirement before the learner types anything`
      );

    expect(broken.join('\n')).toBe('');
  });
});

describe('curriculum declared end states', () => {
  it('should complete every requirement once each file holds its declared end state', () => {
    const broken: string[] = [];

    for (const lesson of authored) {
      const { open, checklist } = lesson.config;
      const endStates = declaredEndState(lesson);

      if (Object.keys(endStates).length === 0) {
        continue;
      }

      // The finished state: every declared end state written to disk, back at the
      // shell — so `saved` and `quit` requirements hold alongside the content ones.
      const seeded = vimLessonEngine.seed(lesson);
      const files = Object.entries(endStates).reduce((current, [target, text]) => {
        const contents = toLines(text);

        return setVirtualFile(current, target, (file) => ({
          ...file,
          contents,
          saved: contents,
          dirty: false,
          written: true,
        }));
      }, seeded.files);

      const written: EditorState = {
        ...seeded,
        buffer: endStates[open] === undefined ? seeded.buffer : toLines(endStates[open]),
        dirty: false,
        files,
      };

      const results = vimLessonEngine.checkRequirements(enterShell(written), lesson);

      results.forEach((result, index) => {
        const test = checklist[index].test;
        // A requirement about a file this lesson declares no end state for makes a
        // claim this state says nothing about, so it is out of scope here.
        const target = test.file;

        // Session predicates (command, anyOfCommands) require action history that
        // the synthetic state does not carry. When a content assertion lives on the
        // same item, it is the content part this test checks — the command
        // reachability is the keystroke test's job.
        const hasSessionPredicate = test.command !== undefined || test.anyOfCommands !== undefined;

        if (
          !result.passed &&
          !result.deferred &&
          !hasSessionPredicate &&
          target !== undefined &&
          endStates[target] !== undefined
        ) {
          broken.push(
            `${name(lesson)} "${checklist[index].label}" rejects its own expected content`
          );
        }
      });
    }

    expect(broken.join('\n')).toBe('');
  });

  it('should declare end states that differ from the seed', () => {
    const broken = authored.flatMap((lesson) =>
      Object.entries(declaredEndState(lesson))
        .filter(([target, text]) => lesson.files[target] === text)
        .map(([target]) => `${name(lesson)} expects ${target} unchanged, so there is nothing to do`)
    );

    expect(broken.join('\n')).toBe('');
  });
});

/**
 * The end state a lesson declares per file, read off its checklist: every test's
 * `equals`, whether authored inline or resolved from a `# --expected--` block,
 * which the loader has already folded into `equals`. Empty for a lesson that only
 * checks keystrokes, or whose content tests are all narrower than a whole file.
 */
function declaredEndState(lesson: AuthoredLessonDefinition): Record<string, string> {
  return Object.fromEntries(
    lesson.config.checklist
      .filter((requirement) => requirement.test.equals !== undefined)
      .map((requirement) => [requirement.test.file!, requirement.test.equals!])
  );
}

/**
 * Every place a lesson's seed disagrees with the end state the previous lesson in its
 * module declares for the same file.
 *
 * A module's file progresses lesson to lesson: nothing persists at runtime, so each
 * lesson reseeds, and the next lesson's seed is authored as the previous lesson's end
 * state. Lesson 5 turns "tea" into "coffee", so lesson 6 opens on "coffee". That makes
 * the pair one fact written twice, and this keeps the two copies honest — edit one side
 * without the other and they stop lining up.
 *
 * Scoped two ways, both deliberate: **within a module**, since each module starts a
 * different file, so the last lesson of one module never constrains the first of the
 * next; and **per path**, so a lesson introducing its own unrelated file (module 01's
 * lab and its `standup.txt`) is untouched by the rule.
 */
function continuityBreaks(all: readonly AuthoredLessonDefinition[]): string[] {
  const byModule = new Map<number, AuthoredLessonDefinition[]>();
  for (const lesson of all) {
    byModule.set(lesson.module, [...(byModule.get(lesson.module) ?? []), lesson]);
  }

  const broken: string[] = [];

  for (const moduleLessons of byModule.values()) {
    const ordered = [...moduleLessons].sort((a, b) => a.lesson - b.lesson);

    for (const [index, lesson] of ordered.slice(0, -1).entries()) {
      const next = ordered[index + 1];

      for (const [path, endState] of Object.entries(declaredEndState(lesson))) {
        const nextSeed = next.files[path];
        if (nextSeed === undefined || nextSeed === endState) {
          continue;
        }

        broken.push(
          `${name(next)} seeds ${path} with text that is not ${name(lesson)}'s end state for it — ` +
            `one side was edited without the other`
        );
      }
    }
  }

  return broken;
}

describe('curriculum file continuity', () => {
  it('should seed each lesson from the end state of the previous lesson in its module', () => {
    expect(continuityBreaks(authored).join('\n')).toBe('');
  });

  // No authored lesson declares an end state yet, so the check above compares nothing
  // until the content rewrite lands. These cases cover the comparison itself, so the
  // guard is known to work rather than merely known to pass.
  describe('the continuity rule itself', () => {
    function workshop(
      lesson: number,
      files: Record<string, string>,
      options: { module?: number; expected?: string } = {}
    ): AuthoredLessonDefinition {
      const [open] = Object.keys(files);
      return {
        id: `w${options.module ?? 1}-${lesson}`,
        module: options.module ?? 1,
        lesson,
        title: `lesson ${lesson}`,
        instructions: 'i',
        type: 'learn',
        files,
        config: {
          start: 'file',
          open,
          cursor: [1, 1],
          checklist: [
            options.expected === undefined
              ? { label: 'press i', test: { command: 'i' } }
              : { label: 'edit the line', test: { file: open, equals: options.expected } },
          ],
        },
      };
    }

    it('should accept a seed that continues the previous end state', () => {
      const breaks = continuityBreaks([
        workshop(1, { 'a.txt': 'tea' }, { expected: 'coffee' }),
        workshop(2, { 'a.txt': 'coffee' }),
      ]);

      expect(breaks).toEqual([]);
    });

    it('should reject a seed that drifted from the previous end state', () => {
      const breaks = continuityBreaks([
        workshop(1, { 'a.txt': 'tea' }, { expected: 'coffee' }),
        workshop(2, { 'a.txt': 'chai' }),
      ]);

      expect(breaks).toHaveLength(1);
      expect(breaks[0]).toContain('seeds a.txt');
    });

    it('should not constrain the first lesson of the next module', () => {
      const breaks = continuityBreaks([
        workshop(1, { 'a.txt': 'tea' }, { expected: 'coffee' }),
        workshop(1, { 'a.txt': 'something else entirely' }, { module: 2 }),
      ]);

      expect(breaks).toEqual([]);
    });

    it('should not constrain a lesson that introduces a different file', () => {
      const breaks = continuityBreaks([
        workshop(1, { 'a.txt': 'tea' }, { expected: 'coffee' }),
        workshop(2, { 'standup.txt': 'unrelated' }),
      ]);

      expect(breaks).toEqual([]);
    });

    it('should not constrain a lesson whose predecessor claims nothing about the text', () => {
      const breaks = continuityBreaks([
        workshop(1, { 'a.txt': 'tea' }),
        workshop(2, { 'a.txt': 'anything' }),
      ]);

      expect(breaks).toEqual([]);
    });
  });
});
