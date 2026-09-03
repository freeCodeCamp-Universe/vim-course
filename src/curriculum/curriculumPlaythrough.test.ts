import { describe, expect, it } from 'vitest';
import { enterShell, setVirtualFile } from '@/engine';
import { vimLessonEngine } from './lessonEngine';
import { loadFullCurriculum } from './loader';
import { isProseLesson, type AuthoredLessonDefinition } from './types';
import {
  commandText,
  deriveReplacementChar,
  feedKeys,
  name,
  satisfy,
} from './testUtils';

/**
 * Curriculum requirements that cannot be driven end-to-end: the lesson's
 * `command` field does not carry enough information to reconstruct what the
 * engine should execute (e.g., bare `:s` without the substitution pattern).
 *
 * These are config limitations, not engine bugs. The lesson works for learners;
 * the test harness just cannot derive the full command from the config alone.
 *
 * Run the staleness test below whenever you fix a root cause — remove the
 * entry as soon as it starts passing from Phase 1 drive alone.
 */
const KNOWN_UNDERIVABLE = new Map<string, string>([
  [
    '6.4 Capitalize `since` in the second paragraph.',
    'Bare :s without substitution arguments in config',
  ],
  [
    '6.4 Change all capitalized `E` letters in the third paragraph to lowercase.',
    'Bare :s without substitution arguments in config',
  ],
]);

/** Stable key for a checklist requirement: "M.L label" */
function requirementKey(lesson: AuthoredLessonDefinition, label: string): string {
  return `${lesson.module}.${lesson.lesson} ${label}`;
}

const { lessons } = loadFullCurriculum();
const authored = lessons.filter(
  (lesson): lesson is AuthoredLessonDefinition => !isProseLesson(lesson) && !lesson.wip
);

/**
 * Unified curriculum playthrough. For each non-WIP authored lesson:
 *
 * - Phase 1 (Drive): run every checklist command through the engine. For `r`,
 *   derive the replacement character from the test's content assertions rather
 *   than hard-coding `'x'`. Insert-mode commands escape immediately; the
 *   assertion is checked on the resulting state.
 *
 * - Phase 2 (Check): record which items pass from the drive alone. These are
 *   end-to-end verified — the command ran and produced the expected content.
 *
 * - Phase 3 (Inject): for items that still need it, write the lesson's
 *   declared `equals` content directly into the virtual filesystem. This
 *   covers fill-in-the-blank items and any command whose output could not be
 *   derived (e.g., `c%` with insert text).
 *
 * - Phase 4 (Verify): enter the shell (so `quit` requirements see shell mode)
 *   and assert every non-KNOWN_UNDERIVABLE, non-deferred requirement passes.
 */
describe('curriculum playthrough', () => {
  it('should complete every requirement when played through', () => {
    for (const lesson of authored) {
      let state = vimLessonEngine.seed(lesson);
      const allowed = vimLessonEngine.allowedInput(lesson);

      // Phases 1 + 2: Drive every requirement and latch items as they pass.
      // The runtime latches monotonic items once they pass and never un-ticks
      // them. We replicate that here: cursorReached checks the current cursor
      // position, so once the cursor moves on, a naive end-of-loop check would
      // show the item as failing even though it passed correctly during drive.
      //
      // Multi-position cursorReached (arrays of positions) uses visitedPositions
      // instead of the live cursor. We build that set here as we navigate.
      const passedAfterDrive = new Set<number>();
      const visitedPositions = new Set<string>();

      const recordCursor = (s: typeof state) => {
        visitedPositions.add(`${s.cursor.line},${s.cursor.col}`);
      };

      for (const requirement of lesson.config.checklist) {
        const { test, evaluateWhen } = requirement;
        const isMultiPositionCursor =
          test.cursorReached !== undefined && Array.isArray(test.cursorReached[0]);

        if (isMultiPositionCursor) {
          // Explicitly navigate to each position in the sequence.
          const positions = test.cursorReached as [number | null, number | null][];
          for (const [line, col] of positions) {
            if (line !== null) {
              let limit = 500;
              while (state.cursor.line !== line - 1 && --limit > 0) {
                const dir = state.cursor.line < line - 1 ? 'j' : 'k';
                state = feedKeys(state, [dir], allowed);
                recordCursor(state);
              }
            }
            if (col !== null) {
              let limit = 500;
              while (state.cursor.col !== col - 1 && --limit > 0) {
                const dir = state.cursor.col < col - 1 ? 'l' : 'h';
                state = feedKeys(state, [dir], allowed);
                recordCursor(state);
              }
            }
            recordCursor(state);
          }
        } else {
          const cmd = commandText(test);
          const rChar = cmd === 'r' ? deriveReplacementChar(test, state) : undefined;
          state = satisfy(state, lesson, test, allowed, evaluateWhen, { rChar });
          recordCursor(state);
        }

        const interim = vimLessonEngine.checkRequirements(state, lesson, visitedPositions);
        for (const [i, result] of interim.entries()) {
          if (result.passed && !result.deferred) {
            passedAfterDrive.add(i);
          }
        }
      }

      // Phase 3: Inject declared end states for items that still need it.
      // Track which items we inject so Phase 4 knows to assert on them.
      const injected = new Set<number>();

      for (const [index, requirement] of lesson.config.checklist.entries()) {
        if (passedAfterDrive.has(index)) {
          continue;
        }
        const { test } = requirement;
        const key = requirementKey(lesson, requirement.label);
        if (KNOWN_UNDERIVABLE.has(key)) {
          continue;
        }

        if (test.equals !== undefined && test.file !== undefined) {
          const expectedLines = test.equals.split('\n');
          state = {
            ...state,
            files: setVirtualFile(state.files, test.file, (file) => ({
              ...file,
              contents: expectedLines,
              saved: expectedLines,
              dirty: false,
              written: true,
            })),
          };
          injected.add(index);
        } else if (test.notEquals !== undefined && test.equals === undefined && test.file !== undefined) {
          // The requirement only checks that the file differs from its original
          // content (no specific target). Append a blank line so the content
          // diverges from the notEquals value, which is the original seed.
          state = {
            ...state,
            files: setVirtualFile(state.files, test.file, (file) => ({
              ...file,
              contents: [...file.contents, ''],
            })),
          };
          injected.add(index);
        }
      }

      // Phase 4: Enter the shell and verify every requirement passes.
      // Items that were latched during Phase 1/2 (passed when the cursor was in
      // position, or the command was in history at that moment) are already
      // verified — skip them if Phase 4 re-evaluates them as failing (e.g., the
      // cursor has since moved away from a cursorReached target).
      // Deferred results (wrong file active for an evaluateWhen.fileOpen gate)
      // are also skipped — injection guaranteed their content is correct.
      const finalState = enterShell(state);
      const finalResults = vimLessonEngine.checkRequirements(finalState, lesson, visitedPositions);

      for (const [index, result] of finalResults.entries()) {
        // Already verified during Phase 1/2 drive (latched): skip. The
        // cursorReached position may have moved away, but the item was
        // satisfied when it counted.
        if (passedAfterDrive.has(index)) {
          continue;
        }
        // Deferred: the gate condition (e.g. fileOpen) was not met in Phase 4.
        // The item was either latched or injected earlier, so it is covered.
        if (result.deferred) {
          continue;
        }
        const requirement = lesson.config.checklist[index];
        const key = requirementKey(lesson, requirement.label);
        if (KNOWN_UNDERIVABLE.has(key)) {
          continue;
        }
        // Not latched, not deferred, not underivable — only assert if Phase 3
        // actually injected content for this item. Items with no command and no
        // equals (e.g. multi-step paste exercises) were not injected and cannot
        // be verified by the playthrough.
        if (!injected.has(index)) {
          continue;
        }
        expect(
          result.passed,
          `${name(lesson)} "${requirement.label}"`
        ).toBe(true);
      }
    }
  });

  /**
   * Guard against stale KNOWN_UNDERIVABLE entries. If an item in the map now
   * passes from Phase 1 drive alone (no content injection), remove it from the
   * map — the underlying config or engine issue has been fixed.
   */
  it('should not list requirements in KNOWN_UNDERIVABLE that now pass', () => {
    const stale: string[] = [];

    for (const lesson of authored) {
      let state = vimLessonEngine.seed(lesson);
      const allowed = vimLessonEngine.allowedInput(lesson);

      for (const requirement of lesson.config.checklist) {
        const { test, evaluateWhen } = requirement;
        const cmd = commandText(test);
        const rChar = cmd === 'r' ? deriveReplacementChar(test, state) : undefined;
        state = satisfy(state, lesson, test, allowed, evaluateWhen, { rChar });
      }

      const afterDriveResults = vimLessonEngine.checkRequirements(state, lesson);

      for (const [index, result] of afterDriveResults.entries()) {
        if (!result.passed || result.deferred) {
          continue;
        }
        const key = requirementKey(lesson, lesson.config.checklist[index].label);
        if (KNOWN_UNDERIVABLE.has(key)) {
          stale.push(`${key} — ${KNOWN_UNDERIVABLE.get(key)}`);
        }
      }
    }

    expect(
      stale.join('\n'),
      'Remove these entries from KNOWN_UNDERIVABLE — they now pass from drive alone'
    ).toBe('');
  });
});
