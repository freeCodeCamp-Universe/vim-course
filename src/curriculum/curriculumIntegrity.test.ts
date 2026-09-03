import { describe, expect, it } from 'vitest';
import { loadFullCurriculum } from './loader';
import { vimLessonEngine } from './lessonEngine';
import { isProseLesson, type AuthoredLessonDefinition } from './types';
import { declaredEndState, name, opensNoFile, toLines } from './testUtils';

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

describe('curriculum start state', () => {
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
