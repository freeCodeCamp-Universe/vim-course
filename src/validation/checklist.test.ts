import { describe, expect, it } from 'vitest';
import { actionCursors, actionModes, type Action } from '@/engine';
import type { AuthoredLessonDefinition, ChecklistRequirement } from '@/curriculum/types';
import {
  describeIncomplete,
  evaluateChecklist,
  type ChecklistContext,
  type LessonFileState,
  type RequirementResult,
} from './checklist';

function lessonWith(
  checklist: ChecklistRequirement[],
  files: Record<string, string> = { 'a.txt': 'foo\nbar' }
): AuthoredLessonDefinition {
  return {
    id: 'l',
    module: 1,
    lesson: 1,
    title: 't',
    instructions: 'i',
    type: 'learn',
    files,
    config: { start: 'file', open: 'a.txt', cursor: [1, 1], checklist },
  };
}

/** A `file` accessor over a path→state map, defaulting the fields a test ignores. */
function fileMap(
  entries: Record<string, Partial<LessonFileState> & Pick<LessonFileState, 'contents'>>
): ChecklistContext['file'] {
  const resolved: Record<string, LessonFileState> = {};

  for (const [path, entry] of Object.entries(entries)) {
    resolved[path] = { saved: entry.contents, dirty: false, written: false, ...entry };
  }

  return (path) => resolved[path] ?? null;
}

function context(overrides: Partial<ChecklistContext> = {}): ChecklistContext {
  return {
    history: [],
    register: null,
    activeFilePath: 'a.txt',
    cursor: { line: 0, col: 0 },
    file: () => null,
    inShell: false,
    showLineNumbers: false,
    quickfix: null,
    quickfixListing: false,
    visitedPositions: null,
    ...overrides,
  };
}

function history(...commands: string[]): Action[] {
  return commands.map((command) => ({ type: 'edit', command }));
}

/** Create an Action with its cursor stamped in the side-channel WeakMap. */
function actionAt(action: Action, cursor: { line: number; col: number }): Action {
  actionCursors.set(action, cursor);
  return action;
}

/** The pass/fail column alone, for the majority of cases that ignore latching. */
function passed(results: RequirementResult[]): boolean[] {
  return results.map((result) => result.passed);
}

describe('evaluateChecklist', () => {
  describe('session predicates', () => {
    it('should complete a single command requirement once the command runs', () => {
      const lesson = lessonWith([{ label: 'x', test: { command: 'x' } }]);

      expect(passed(evaluateChecklist(lesson, context()))).toEqual([false]);
      expect(passed(evaluateChecklist(lesson, context({ history: history('x') })))).toEqual([true]);
    });

    it('should evaluate multi-item requirements independently', () => {
      const lesson = lessonWith([
        { label: 'delete', test: { command: 'dd' } },
        { label: 'undo', test: { command: 'u' } },
      ]);

      expect(passed(evaluateChecklist(lesson, context({ history: history('dd') })))).toEqual([
        true,
        false,
      ]);
      expect(passed(evaluateChecklist(lesson, context({ history: history('dd', 'u') })))).toEqual([
        true,
        true,
      ]);
    });

    it('should match a taught command regardless of count', () => {
      const lesson = lessonWith([{ label: '3dd', test: { command: 'dd' } }]);
      const counted: Action[] = [{ type: 'edit', command: 'dd', count: 3 }];

      expect(passed(evaluateChecklist(lesson, context({ history: counted })))).toEqual([true]);
    });

    it('should treat Esc and the recorded Escape as the same command', () => {
      const lesson = lessonWith([{ label: 'esc', test: { command: 'Esc' } }]);
      const escape: Action[] = [{ type: 'mode', command: 'Escape' }];

      expect(passed(evaluateChecklist(lesson, context({ history: escape })))).toEqual([true]);
    });

    it('should match a command only when issued from the required mode', () => {
      const lesson = lessonWith([
        { label: 'leave visual', test: { command: { command: 'Esc', fromMode: 'visual' } } },
      ]);
      const insertEscape: Action = { type: 'mode', command: 'Escape' };
      const visualEscape: Action = { type: 'mode', command: 'Escape' };
      actionModes.set(insertEscape, 'insert');
      actionModes.set(visualEscape, 'visual');

      expect(passed(evaluateChecklist(lesson, context({ history: [insertEscape] })))).toEqual([
        false,
      ]);
      expect(passed(evaluateChecklist(lesson, context({ history: [visualEscape] })))).toEqual([
        true,
      ]);
    });

    it('should complete a file-open requirement only when the expected file is active', () => {
      const lesson = lessonWith([{ label: 'open', test: { open: 'target.txt' } }]);

      expect(passed(evaluateChecklist(lesson, context({ activeFilePath: 'a.txt' })))).toEqual([
        false,
      ]);
      expect(passed(evaluateChecklist(lesson, context({ activeFilePath: 'target.txt' })))).toEqual([
        true,
      ]);
    });

    it('should complete a cursor-line requirement only on the 1-based line asked for', () => {
      const lesson = lessonWith([{ label: 'day 7', test: { cursorAt: [7, null] } }]);

      expect(passed(evaluateChecklist(lesson, context({ cursor: { line: 5, col: 0 } })))).toEqual([
        false,
      ]);
      expect(passed(evaluateChecklist(lesson, context({ cursor: { line: 6, col: 0 } })))).toEqual([
        true,
      ]);
      // the column is free when only the line is asserted
      expect(passed(evaluateChecklist(lesson, context({ cursor: { line: 6, col: 12 } })))).toEqual([
        true,
      ]);
    });

    it('should complete a cursor-column requirement only on the 1-based column asked for', () => {
      const lesson = lessonWith([{ label: 'line end', test: { cursorAt: [null, 20] } }]);

      expect(passed(evaluateChecklist(lesson, context({ cursor: { line: 3, col: 18 } })))).toEqual([
        false,
      ]);
      expect(passed(evaluateChecklist(lesson, context({ cursor: { line: 3, col: 19 } })))).toEqual([
        true,
      ]);
    });

    it('should require both cursor coordinates when both are asserted', () => {
      const lesson = lessonWith([{ label: 'summit', test: { cursorAt: [7, 16] } }]);

      expect(passed(evaluateChecklist(lesson, context({ cursor: { line: 6, col: 0 } })))).toEqual([
        false,
      ]);
      expect(passed(evaluateChecklist(lesson, context({ cursor: { line: 0, col: 15 } })))).toEqual([
        false,
      ]);
      expect(passed(evaluateChecklist(lesson, context({ cursor: { line: 6, col: 15 } })))).toEqual([
        true,
      ]);
    });

    it('should require a command and the cursor position together (AND)', () => {
      const lesson = lessonWith([
        { label: 'j to day 7', test: { command: 'j', cursorAt: [7, null] } },
      ]);
      const moved = history('j');

      expect(passed(evaluateChecklist(lesson, context({ cursor: { line: 6, col: 0 } })))).toEqual([
        false,
      ]);
      expect(
        passed(evaluateChecklist(lesson, context({ history: moved, cursor: { line: 2, col: 0 } })))
      ).toEqual([false]);
      expect(
        passed(evaluateChecklist(lesson, context({ history: moved, cursor: { line: 6, col: 0 } })))
      ).toEqual([true]);
    });

    it('should count visited multi-position cursor requirements', () => {
      const lesson = lessonWith([
        {
          label: 'trace',
          test: {
            cursorAt: [
              [1, 1],
              [2, 2],
              [1, 2],
            ],
          },
        },
      ]);

      expect(evaluateChecklist(lesson, context({ visitedPositions: new Set(['0,0']) }))).toEqual([
        { passed: false, monotonic: true, count: 1, total: 3 },
      ]);
      expect(
        evaluateChecklist(lesson, context({ visitedPositions: new Set(['1,1', '0,0']) }))
      ).toEqual([{ passed: false, monotonic: true, count: 2, total: 3 }]);
    });

    it('should pass a multi-position cursor requirement when all positions were visited', () => {
      const lesson = lessonWith([
        {
          label: 'trace',
          test: {
            cursorAt: [
              [1, 1],
              [2, 2],
            ],
          },
        },
      ]);

      expect(
        evaluateChecklist(lesson, context({ visitedPositions: new Set(['1,1', '0,0']) }))
      ).toEqual([{ passed: true, monotonic: true, count: 2, total: 2 }]);
    });

    it('should count multi-position visits regardless of order and ignore unlisted positions', () => {
      const lesson = lessonWith([
        {
          label: 'trace',
          test: {
            cursorAt: [
              [1, 1],
              [2, 2],
            ],
          },
        },
      ]);

      expect(
        evaluateChecklist(lesson, context({ visitedPositions: new Set(['8,8', '1,1', '0,0']) }))
      ).toEqual([{ passed: true, monotonic: true, count: 2, total: 2 }]);
    });

    it('should require every present predicate to hold (AND)', () => {
      const lesson = lessonWith([
        { label: 'open with :e', test: { command: ':e', open: 'target.txt' } },
      ]);
      const opened: Action[] = [{ type: 'ex', command: ':e target.txt' }];

      // command ran but wrong file active
      expect(
        passed(evaluateChecklist(lesson, context({ history: opened, activeFilePath: 'a.txt' })))
      ).toEqual([false]);
      // command ran and correct file active
      expect(
        passed(
          evaluateChecklist(lesson, context({ history: opened, activeFilePath: 'target.txt' }))
        )
      ).toEqual([true]);
    });

    it('should match an ex verb against its argument form but not a longer verb', () => {
      const substitute = lessonWith([{ label: 'sub', test: { command: ':%s' } }]);
      const substituted: Action[] = [{ type: 'ex', command: ':%s/a/b/g' }];
      expect(passed(evaluateChecklist(substitute, context({ history: substituted })))).toEqual([
        true,
      ]);

      // `:w` must never be satisfied by `:wq`.
      const write = lessonWith([{ label: 'write', test: { command: ':w' } }]);
      const quit: Action[] = [{ type: 'ex', command: ':wq' }];
      expect(passed(evaluateChecklist(write, context({ history: quit })))).toEqual([false]);
    });

    it('should match a /pattern/flags command as a regex, discriminating on flags', () => {
      const lesson = lessonWith([
        { label: 'sub', test: { command: '/^:%s\\/.*\\/.*\\/(?!.*n)[gi]*$/' } },
      ]);

      const substituting: Action[] = [{ type: 'ex', command: ':%s/a/b/g' }];
      const counting: Action[] = [{ type: 'ex', command: ':%s/a//gn' }];

      expect(passed(evaluateChecklist(lesson, context({ history: substituting })))).toEqual([true]);
      expect(passed(evaluateChecklist(lesson, context({ history: counting })))).toEqual([false]);
    });

    it('should reject an argument form when the test is exact', () => {
      const lesson = lessonWith([{ label: 'bare :e', test: { command: ':e', exact: true } }]);

      const withArgument: Action[] = [{ type: 'ex', command: ':e target.txt' }];
      const bare: Action[] = [{ type: 'ex', command: ':e' }];

      expect(passed(evaluateChecklist(lesson, context({ history: withArgument })))).toEqual([
        false,
      ]);
      expect(passed(evaluateChecklist(lesson, context({ history: bare })))).toEqual([true]);
    });

    it('should reject an equivalent spelling of a :set option when the test is exact', () => {
      const lesson = lessonWith([
        { label: 'nonumber', test: { command: ':set nonumber', exact: true } },
      ]);

      for (const spelling of [':set nonu', ':set number!', ':set invnumber']) {
        const typed: Action[] = [{ type: 'ex', command: spelling }];
        expect(passed(evaluateChecklist(lesson, context({ history: typed })))).toEqual([false]);
      }

      const asked: Action[] = [{ type: 'ex', command: ':set nonumber' }];
      expect(passed(evaluateChecklist(lesson, context({ history: asked })))).toEqual([true]);
    });

    it('should still accept every spelling when the same test is not exact', () => {
      const lesson = lessonWith([{ label: 'any :set', test: { command: ':set' } }]);

      for (const spelling of [':set nonu', ':set number!', ':set nonumber']) {
        const typed: Action[] = [{ type: 'ex', command: spelling }];
        expect(passed(evaluateChecklist(lesson, context({ history: typed })))).toEqual([true]);
      }
    });

    it('should keep an exact test count-agnostic, since the count is recorded separately', () => {
      const lesson = lessonWith([{ label: 'line 7', test: { command: 'G', exact: true } }]);
      const counted: Action[] = [{ type: 'motion', command: 'G', count: 7 }];

      expect(passed(evaluateChecklist(lesson, context({ history: counted })))).toEqual([true]);
    });

    it('should not let insert-mode typing satisfy a normal-mode command item', () => {
      const lesson = lessonWith([{ label: 'append', test: { command: 'A' } }]);
      // A capital "A" typed in insert mode versus the normal-mode append command.
      const typed: Action[] = [{ type: 'insert', command: 'A' }];
      const appended: Action[] = [{ type: 'mode', command: 'A' }];

      expect(passed(evaluateChecklist(lesson, context({ history: typed })))).toEqual([false]);
      expect(passed(evaluateChecklist(lesson, context({ history: appended })))).toEqual([true]);
    });

    it('should still match Enter, the one insert-type action a lesson asserts', () => {
      const lesson = lessonWith([{ label: 'split', test: { command: 'Enter' } }]);
      const enter: Action[] = [{ type: 'insert', command: 'Enter' }];

      expect(passed(evaluateChecklist(lesson, context({ history: enter })))).toEqual([true]);
    });

    it('should require the typed count when count is set', () => {
      const lesson = lessonWith([{ label: '7G', test: { command: 'G', count: 7 } }]);
      const bare: Action[] = [{ type: 'motion', command: 'G' }];
      const wrong: Action[] = [{ type: 'motion', command: 'G', count: 4 }];
      const right: Action[] = [{ type: 'motion', command: 'G', count: 7 }];

      expect(passed(evaluateChecklist(lesson, context({ history: bare })))).toEqual([false]);
      expect(passed(evaluateChecklist(lesson, context({ history: wrong })))).toEqual([false]);
      expect(passed(evaluateChecklist(lesson, context({ history: right })))).toEqual([true]);
    });

    it('should keep count-agnostic matching when count is omitted', () => {
      const lesson = lessonWith([{ label: 'any G', test: { command: 'G' } }]);
      const counted: Action[] = [{ type: 'motion', command: 'G', count: 7 }];
      const bare: Action[] = [{ type: 'motion', command: 'G' }];

      expect(passed(evaluateChecklist(lesson, context({ history: counted })))).toEqual([true]);
      expect(passed(evaluateChecklist(lesson, context({ history: bare })))).toEqual([true]);
    });

    it('should complete anyOfCommands when any alternative appears in history', () => {
      const lesson = lessonWith([
        { label: 'enter insert mode', test: { anyOfCommands: ['i', 'a', 'A', 'o', 'O'] } },
      ]);

      expect(passed(evaluateChecklist(lesson, context({ history: history('x') })))).toEqual([
        false,
      ]);
      expect(passed(evaluateChecklist(lesson, context({ history: history('a') })))).toEqual([true]);
    });

    it('should keep count scoped to the matcher entry that declares it', () => {
      const lesson = lessonWith([
        {
          label: 'jump to line 7 or top',
          test: { anyOfCommands: [{ command: 'G', count: 7 }, 'gg'] },
        },
      ]);

      const bareG: Action[] = [{ type: 'motion', command: 'G' }];
      const sevenG: Action[] = [{ type: 'motion', command: 'G', count: 7 }];
      const gg: Action[] = [{ type: 'motion', command: 'gg' }];

      expect(passed(evaluateChecklist(lesson, context({ history: bareG })))).toEqual([false]);
      expect(passed(evaluateChecklist(lesson, context({ history: sevenG })))).toEqual([true]);
      expect(passed(evaluateChecklist(lesson, context({ history: gg })))).toEqual([true]);
    });

    it('should require the command to have been issued at the specified cursor position when commandAt is set', () => {
      const lesson = lessonWith([
        { label: 'yank line 3', test: { command: 'yy', commandAt: [3, null] } },
      ]);

      const onLine3 = actionAt({ type: 'edit', command: 'yy' }, { line: 2, col: 0 });
      const onLine1 = actionAt({ type: 'edit', command: 'yy' }, { line: 0, col: 0 });
      const noCursor: Action[] = [{ type: 'edit', command: 'yy' }];

      expect(passed(evaluateChecklist(lesson, context({ history: [onLine3] })))).toEqual([true]);
      expect(passed(evaluateChecklist(lesson, context({ history: [onLine1] })))).toEqual([false]);
      expect(passed(evaluateChecklist(lesson, context({ history: noCursor })))).toEqual([false]);
    });

    it('should not cross-satisfy two commandAt tests on different lines', () => {
      const lesson = lessonWith([
        { label: 'yank line 3', test: { command: 'yy', commandAt: [3, null] } },
        { label: 'yank line 4', test: { command: 'yy', commandAt: [4, null] } },
      ]);

      const yyOnLine3 = actionAt({ type: 'edit', command: 'yy' }, { line: 2, col: 0 });

      expect(passed(evaluateChecklist(lesson, context({ history: [yyOnLine3] })))).toEqual([
        true,
        false,
      ]);

      const yyOnLine4 = actionAt({ type: 'edit', command: 'yy' }, { line: 3, col: 0 });

      expect(
        passed(evaluateChecklist(lesson, context({ history: [yyOnLine3, yyOnLine4] })))
      ).toEqual([true, true]);
    });

    it('should match commandAt with a specific column when both are constrained', () => {
      const lesson = lessonWith([{ label: 'x at 2,5', test: { command: 'x', commandAt: [2, 5] } }]);

      const rightSpot = actionAt({ type: 'edit', command: 'x' }, { line: 1, col: 4 });
      const wrongCol = actionAt({ type: 'edit', command: 'x' }, { line: 1, col: 0 });

      expect(passed(evaluateChecklist(lesson, context({ history: [rightSpot] })))).toEqual([true]);
      expect(passed(evaluateChecklist(lesson, context({ history: [wrongCol] })))).toEqual([false]);
    });

    it('should latch an commandAt test once satisfied', () => {
      const lesson = lessonWith([
        { label: 'yank line 3', test: { command: 'yy', commandAt: [3, null] } },
      ]);

      const action = actionAt({ type: 'edit', command: 'yy' }, { line: 2, col: 0 });
      const results = evaluateChecklist(lesson, context({ history: [action] }));

      expect(results).toEqual([{ passed: true, monotonic: true }]);
    });
  });

  describe('state predicates', () => {
    it('should defer file checks while the quickfix listing is visible', () => {
      const lesson = lessonWith([{ label: 'exact', test: { file: 'a.txt', equals: 'foo\nbar' } }]);

      const result = evaluateChecklist(
        lesson,
        context({
          quickfixListing: true,
          file: fileMap({ 'a.txt': { contents: ['foo', 'bar'] } }),
        })
      );

      expect(result).toEqual([{ passed: false, monotonic: false, deferred: true }]);
    });

    it('should compare the whole file with equals', () => {
      const lesson = lessonWith([{ label: 'exact', test: { file: 'a.txt', equals: 'foo\nbaz' } }]);

      expect(
        passed(
          evaluateChecklist(
            lesson,
            context({ file: fileMap({ 'a.txt': { contents: ['foo', 'baz'] } }) })
          )
        )
      ).toEqual([true]);
      expect(
        passed(
          evaluateChecklist(
            lesson,
            context({ file: fileMap({ 'a.txt': { contents: ['foo', 'baz', ''] } }) })
          )
        )
      ).toEqual([false]);
    });

    it('should pass notEquals only when the full file differs', () => {
      const lesson = lessonWith([
        { label: 'changed', test: { file: 'a.txt', notEquals: 'foo\nbaz' } },
      ]);

      expect(
        passed(
          evaluateChecklist(
            lesson,
            context({ file: fileMap({ 'a.txt': { contents: ['foo', 'baz'] } }) })
          )
        )
      ).toEqual([false]);
      expect(
        passed(
          evaluateChecklist(
            lesson,
            context({ file: fileMap({ 'a.txt': { contents: ['foo', 'qux'] } }) })
          )
        )
      ).toEqual([true]);
    });

    it('should compare notEquals against the saved file when requested', () => {
      const lesson = lessonWith([
        {
          label: 'saved change',
          test: { file: 'a.txt', notEquals: 'foo', matchAgainstSaved: true },
        },
      ]);

      expect(
        passed(
          evaluateChecklist(
            lesson,
            context({
              file: fileMap({
                'a.txt': { contents: ['changed'], saved: ['foo'], dirty: true, written: true },
              }),
            })
          )
        )
      ).toEqual([false]);
      expect(
        passed(
          evaluateChecklist(
            lesson,
            context({
              file: fileMap({
                'a.txt': {
                  contents: ['changed'],
                  saved: ['changed'],
                  dirty: false,
                  written: true,
                },
              }),
            })
          )
        )
      ).toEqual([true]);
    });

    it('should ignore blank lines and trailing whitespace with normalizeWhitespace', () => {
      const lesson = lessonWith([
        {
          label: 'loose',
          test: {
            file: 'a.txt',
            equals: '# Title\n\nfirst para\n\nsecond para',
            normalizeWhitespace: true,
          },
        },
      ]);

      // Extra blank line, a missing blank line, and trailing spaces all still pass.
      const accepted = [
        ['# Title', '', 'first para', '', 'second para'],
        ['# Title', '', '', 'first para', 'second para'],
        ['# Title', 'first para', 'second para'],
        ['# Title  ', '', 'first para\t', '', 'second para', ''],
      ];

      for (const contents of accepted) {
        expect(
          passed(evaluateChecklist(lesson, context({ file: fileMap({ 'a.txt': { contents } }) })))
        ).toEqual([true]);
      }

      // Joining two paragraphs onto one line is a real difference and still fails.
      expect(
        passed(
          evaluateChecklist(
            lesson,
            context({
              file: fileMap({ 'a.txt': { contents: ['# Title', 'first para second para'] } }),
            })
          )
        )
      ).toEqual([false]);
    });

    it('should reject text that has the right words in the wrong place', () => {
      const lesson = lessonWith([
        { label: 'coffee', test: { file: 'a.txt', equals: 'a cup of coffee' } },
      ]);

      // Substring matching would accept all of these; exact comparison does not.
      for (const contents of [['a coffee cup of'], ['a cup of coffee!'], ['a cup of  coffee']]) {
        expect(
          passed(evaluateChecklist(lesson, context({ file: fileMap({ 'a.txt': { contents } }) })))
        ).toEqual([false]);
      }
    });

    it('should pass contains and absent together over the whole file', () => {
      const lesson = lessonWith([
        { label: 'swapped', test: { file: 'a.txt', contains: ['baz'], absent: ['bar'] } },
      ]);

      expect(
        passed(
          evaluateChecklist(
            lesson,
            context({ file: fileMap({ 'a.txt': { contents: ['foo', 'baz'] } }) })
          )
        )
      ).toEqual([true]);
      expect(
        passed(
          evaluateChecklist(
            lesson,
            context({ file: fileMap({ 'a.txt': { contents: ['foo', 'bar', 'baz'] } }) })
          )
        )
      ).toEqual([false]);
    });

    it('should treat /pattern/flags entries in contains as a whole-file regex', () => {
      const lesson = lessonWith([
        {
          label: 'paragraph after the layout block',
          test: { file: 'a.txt', contains: ['/Bottom Row.*\\n\\s*\\nHowever/s'] },
        },
      ]);

      expect(
        passed(
          evaluateChecklist(
            lesson,
            context({
              file: fileMap({ 'a.txt': { contents: ['Bottom Row', '', 'However'] } }),
            })
          )
        )
      ).toEqual([true]);
      expect(
        passed(
          evaluateChecklist(
            lesson,
            context({
              file: fileMap({ 'a.txt': { contents: ['However', '', 'Bottom Row'] } }),
            })
          )
        )
      ).toEqual([false]);
    });

    it('should match the entire file with a matches regex', () => {
      const lesson = lessonWith([
        {
          label: 'match the file',
          test: { file: 'a.txt', matches: '/^Hello\\n[Aa]lpha[ \\t]*Beta$/' },
        },
      ]);

      expect(
        passed(
          evaluateChecklist(
            lesson,
            context({ file: fileMap({ 'a.txt': { contents: ['Hello', 'alpha Beta'] } }) })
          )
        )
      ).toEqual([true]);
      expect(
        passed(
          evaluateChecklist(
            lesson,
            context({ file: fileMap({ 'a.txt': { contents: ['Hello', 'alpha Gamma'] } }) })
          )
        )
      ).toEqual([false]);
    });

    it('should treat /pattern/flags entries in absent as regex', () => {
      const lesson = lessonWith([
        { label: 'no digits', test: { file: 'a.txt', absent: ['/\\d+/'] } },
      ]);

      expect(
        passed(
          evaluateChecklist(
            lesson,
            context({ file: fileMap({ 'a.txt': { contents: ['hello'] } }) })
          )
        )
      ).toEqual([true]);
      expect(
        passed(
          evaluateChecklist(
            lesson,
            context({ file: fileMap({ 'a.txt': { contents: ['abc123'] } }) })
          )
        )
      ).toEqual([false]);
    });

    it('should count substring, exact-line, and regex occurrences', () => {
      const lesson = lessonWith([
        {
          label: 'count matches',
          test: {
            file: 'a.txt',
            occurrences: [
              { needle: 'alpha', count: 2 },
              { needle: '- beta', count: 1, exact: true },
              { needle: '/gamma\\d/', count: 2 },
            ],
          },
        },
      ]);

      expect(
        passed(
          evaluateChecklist(
            lesson,
            context({
              file: fileMap({
                'a.txt': { contents: ['alpha beta', '- beta', 'alpha gamma1 gamma2'] },
              }),
            })
          )
        )
      ).toEqual([true]);
    });

    it('should fail occurrence checks when any count differs', () => {
      const lesson = lessonWith([
        {
          label: 'count matches',
          test: { file: 'a.txt', occurrences: [{ needle: 'alpha', count: 1 }] },
        },
      ]);

      expect(
        passed(
          evaluateChecklist(
            lesson,
            context({ file: fileMap({ 'a.txt': { contents: ['alpha alpha'] } }) })
          )
        )
      ).toEqual([false]);
    });

    it('should read one addressed line with equals, contains, and matches', () => {
      const state = context({
        file: fileMap({ 'a.txt': { contents: ['H: Hydrogen', 'O: Oxygen'] } }),
      });

      const line = (test: { equals?: string; contains?: string; matches?: string }) =>
        lessonWith([{ label: 'l', test: { file: 'a.txt', line: { number: 2, ...test } } }]);

      expect(passed(evaluateChecklist(line({ equals: 'O: Oxygen' }), state))).toEqual([true]);
      expect(passed(evaluateChecklist(line({ contains: 'Oxygen' }), state))).toEqual([true]);
      expect(passed(evaluateChecklist(line({ matches: '^O:\\s+\\w+$' }), state))).toEqual([true]);
    });

    it('should pass blank: true for an empty or whitespace-only file', () => {
      const lesson = lessonWith([{ label: 'empty', test: { file: 'a.txt', blank: true } }]);

      for (const contents of [[''], ['   '], ['', ''], [' \t ', '']]) {
        expect(
          passed(evaluateChecklist(lesson, context({ file: fileMap({ 'a.txt': { contents } }) })))
        ).toEqual([true]);
      }

      expect(
        passed(
          evaluateChecklist(lesson, context({ file: fileMap({ 'a.txt': { contents: ['x'] } }) }))
        )
      ).toEqual([false]);
    });

    it('should pass blank: false only when the file has non-whitespace content', () => {
      const lesson = lessonWith([{ label: 'not empty', test: { file: 'a.txt', blank: false } }]);

      expect(
        passed(
          evaluateChecklist(lesson, context({ file: fileMap({ 'a.txt': { contents: ['foo'] } }) }))
        )
      ).toEqual([true]);
      expect(
        passed(
          evaluateChecklist(lesson, context({ file: fileMap({ 'a.txt': { contents: ['  '] } }) }))
        )
      ).toEqual([false]);
    });

    it('should fail a line test that addresses past the end of the file', () => {
      const lesson = lessonWith([
        { label: 'l', test: { file: 'a.txt', line: { number: 9, contains: 'x' } } },
      ]);

      expect(
        passed(
          evaluateChecklist(lesson, context({ file: fileMap({ 'a.txt': { contents: ['foo'] } }) }))
        )
      ).toEqual([false]);
    });

    it('should fail a saved test on a clean file that was never written', () => {
      const lesson = lessonWith([{ label: 'saved', test: { file: 'a.txt', saved: true } }]);

      expect(
        passed(
          evaluateChecklist(
            lesson,
            context({
              file: fileMap({ 'a.txt': { contents: ['foo'], dirty: false, written: false } }),
            })
          )
        )
      ).toEqual([false]);
      expect(
        passed(
          evaluateChecklist(
            lesson,
            context({
              file: fileMap({ 'a.txt': { contents: ['foo'], dirty: false, written: true } }),
            })
          )
        )
      ).toEqual([true]);
    });

    it('should read each file separately, so one file passes while another fails', () => {
      const lesson = lessonWith([
        { label: 'edited', test: { file: 'a.txt', equals: 'edited' } },
        { label: 'left alone', test: { file: 'b.txt', equals: 'pristine' } },
      ]);

      const state = context({
        file: fileMap({
          'a.txt': { contents: ['edited'] },
          'b.txt': { contents: ['meddled with'] },
        }),
      });

      expect(passed(evaluateChecklist(lesson, state))).toEqual([true, false]);
    });

    it('should keep a left-alone assertion true across a save of the other file', () => {
      // The reason "left alone" is an `equals` against the seed rather than a
      // question about the modified flag: saving clears that flag, so a flag-based
      // predicate would pass for a file the learner rewrote and wrote out.
      const lesson = lessonWith([
        { label: 'left alone', test: { file: 'b.txt', equals: 'pristine' } },
      ]);

      const rewrittenAndSaved = context({
        file: fileMap({
          'b.txt': { contents: ['rewritten'], saved: ['rewritten'], dirty: false, written: true },
        }),
      });

      expect(passed(evaluateChecklist(lesson, rewrittenAndSaved))).toEqual([false]);
    });

    it('should fail every predicate when the named file does not exist', () => {
      const lesson = lessonWith([{ label: 'gone', test: { file: 'nope.txt', contains: ['x'] } }]);

      expect(
        passed(
          evaluateChecklist(lesson, context({ file: fileMap({ 'a.txt': { contents: ['foo'] } }) }))
        )
      ).toEqual([false]);
    });

    it('should pass quit only once the learner is back at the terminal', () => {
      const lesson = lessonWith([{ label: 'quit', test: { quit: true } }]);

      expect(passed(evaluateChecklist(lesson, context({ inShell: false })))).toEqual([false]);
      expect(passed(evaluateChecklist(lesson, context({ inShell: true })))).toEqual([true]);
    });

    it('should read lineNumbers off the current gutter state in both directions', () => {
      const on = lessonWith([{ label: 'gutter on', test: { lineNumbers: true } }]);
      expect(passed(evaluateChecklist(on, context({ showLineNumbers: false })))).toEqual([false]);
      expect(passed(evaluateChecklist(on, context({ showLineNumbers: true })))).toEqual([true]);

      const off = lessonWith([{ label: 'gutter off', test: { lineNumbers: false } }]);
      expect(passed(evaluateChecklist(off, context({ showLineNumbers: true })))).toEqual([false]);
      expect(passed(evaluateChecklist(off, context({ showLineNumbers: false })))).toEqual([true]);
    });

    it('should treat lineNumbers as live, so it never latches', () => {
      const lesson = lessonWith([{ label: 'gutter on', test: { lineNumbers: true } }]);

      expect(evaluateChecklist(lesson, context({ showLineNumbers: true }))[0]).toEqual({
        passed: true,
        monotonic: false,
      });
    });

    it('should pass register.equals when the unnamed register text matches exactly', () => {
      const lesson = lessonWith([{ label: 'register', test: { register: { equals: '☆' } } }]);

      expect(
        passed(evaluateChecklist(lesson, context({ register: { text: '☆', linewise: false } })))
      ).toEqual([true]);
    });

    it('should fail register.equals when the unnamed register text differs', () => {
      const lesson = lessonWith([{ label: 'register', test: { register: { equals: '☆' } } }]);

      expect(
        passed(evaluateChecklist(lesson, context({ register: { text: '*', linewise: false } })))
      ).toEqual([false]);
    });

    it('should fail register.equals when the unnamed register is null', () => {
      const lesson = lessonWith([{ label: 'register', test: { register: { equals: '☆' } } }]);

      expect(passed(evaluateChecklist(lesson, context({ register: null })))).toEqual([false]);
    });

    it('should pass and fail register.contains on substring matches', () => {
      const lesson = lessonWith([{ label: 'register', test: { register: { contains: 'star' } } }]);

      expect(
        passed(
          evaluateChecklist(lesson, context({ register: { text: 'a star', linewise: false } }))
        )
      ).toEqual([true]);
      expect(
        passed(evaluateChecklist(lesson, context({ register: { text: 'moon', linewise: false } })))
      ).toEqual([false]);
    });

    it('should pass and fail register.matches on regex matches', () => {
      const lesson = lessonWith([{ label: 'register', test: { register: { matches: '^star$' } } }]);

      expect(
        passed(evaluateChecklist(lesson, context({ register: { text: 'star', linewise: false } })))
      ).toEqual([true]);
      expect(
        passed(
          evaluateChecklist(lesson, context({ register: { text: 'a star', linewise: false } }))
        )
      ).toEqual([false]);
    });

    it('should require all register fields to pass', () => {
      const lesson = lessonWith([
        {
          label: 'register',
          test: { register: { equals: 'a star', contains: 'star' } },
        },
      ]);

      expect(
        passed(
          evaluateChecklist(lesson, context({ register: { text: 'a star', linewise: false } }))
        )
      ).toEqual([true]);
      expect(
        passed(evaluateChecklist(lesson, context({ register: { text: 'star', linewise: false } })))
      ).toEqual([false]);
    });

    it('should keep register predicates live and non-latching', () => {
      const lesson = lessonWith([{ label: 'register', test: { register: { equals: '☆' } } }]);

      expect(evaluateChecklist(lesson, context())[0].monotonic).toBe(false);
    });
  });

  describe('matchAgainstSaved', () => {
    const lesson = lessonWith([
      { label: 'coffee', test: { file: 'a.txt', matchAgainstSaved: true, equals: 'coffee' } },
    ]);

    it('should stay unfinished while the correct text is unsaved in the buffer', () => {
      const state = context({
        file: fileMap({ 'a.txt': { contents: ['coffee'], saved: ['tea'], dirty: true } }),
      });

      expect(passed(evaluateChecklist(lesson, state))).toEqual([false]);
    });

    it('should complete once the correct text is written', () => {
      const state = context({
        file: fileMap({ 'a.txt': { contents: ['coffee'], saved: ['coffee'], written: true } }),
      });

      expect(passed(evaluateChecklist(lesson, state))).toEqual([true]);
    });

    it('should stay complete when the learner then breaks the buffer without saving', () => {
      const state = context({
        file: fileMap({
          'a.txt': { contents: ['wrecked'], saved: ['coffee'], dirty: true, written: true },
        }),
      });

      expect(passed(evaluateChecklist(lesson, state))).toEqual([true]);
    });

    it('should un-complete after a second write commits the broken buffer', () => {
      const state = context({
        file: fileMap({ 'a.txt': { contents: ['wrecked'], saved: ['wrecked'], written: true } }),
      });

      expect(passed(evaluateChecklist(lesson, state))).toEqual([false]);
    });

    it('should read a seeded, never-written file against its seed copy', () => {
      // The saved copy holds the seed text until the first :w, so the buffer being
      // right is not enough.
      const state = context({
        file: fileMap({
          'a.txt': { contents: ['coffee'], saved: ['tea'], dirty: true, written: false },
        }),
      });

      expect(passed(evaluateChecklist(lesson, state))).toEqual([false]);
    });

    it('should fail a created file before its first write', () => {
      const created = lessonWith([
        {
          label: 'notes',
          test: { file: 'new.md', newFile: true, matchAgainstSaved: true, equals: 'hi' },
        },
      ]);

      expect(passed(evaluateChecklist(created, context({ file: () => null })))).toEqual([false]);
    });

    it('should redirect line, contains, and absent, not only equals', () => {
      const multi = lessonWith([
        {
          label: 'contains',
          test: { file: 'a.txt', matchAgainstSaved: true, contains: ['coffee'] },
        },
        { label: 'absent', test: { file: 'a.txt', matchAgainstSaved: true, absent: ['tea'] } },
        {
          label: 'line',
          test: { file: 'a.txt', matchAgainstSaved: true, line: { number: 1, equals: 'coffee' } },
        },
      ]);

      // Buffer has the right text, but the saved copy is still the seed: all three
      // read the saved copy and fail.
      const unsaved = context({
        file: fileMap({ 'a.txt': { contents: ['coffee'], saved: ['tea'], dirty: true } }),
      });
      expect(passed(evaluateChecklist(multi, unsaved))).toEqual([false, false, false]);

      const written = context({
        file: fileMap({ 'a.txt': { contents: ['coffee'], saved: ['coffee'], written: true } }),
      });
      expect(passed(evaluateChecklist(multi, written))).toEqual([true, true, true]);
    });

    it('should not latch, so a second save can un-tick it', () => {
      const [result] = evaluateChecklist(
        lesson,
        context({
          file: fileMap({ 'a.txt': { contents: ['coffee'], saved: ['coffee'], written: true } }),
        })
      );

      expect(result).toEqual({ passed: true, monotonic: false });
    });
  });

  describe('mixing session and state predicates', () => {
    it('should require a command and its resulting text together (AND)', () => {
      const lesson = lessonWith([
        { label: 'edit then save', test: { command: ':w', file: 'a.txt', equals: 'coffee' } },
      ]);
      const saved: Action[] = [{ type: 'ex', command: ':w' }];
      const coffee = fileMap({ 'a.txt': { contents: ['coffee'] } });
      const tea = fileMap({ 'a.txt': { contents: ['tea'] } });

      // right text, never saved
      expect(passed(evaluateChecklist(lesson, context({ file: coffee })))).toEqual([false]);
      // saved, wrong text
      expect(passed(evaluateChecklist(lesson, context({ history: saved, file: tea })))).toEqual([
        false,
      ]);
      expect(passed(evaluateChecklist(lesson, context({ history: saved, file: coffee })))).toEqual([
        true,
      ]);
    });

    it('should prove the right file was fixed and the other left alone', () => {
      // The case a single-file, keystroke-only test could never express: pressing
      // `x` somewhere is not the same as fixing the file the lesson named.
      const lesson = lessonWith(
        [
          {
            label: 'fix return-key.md',
            test: { command: 'x', open: 'return-key.md', file: 'return-key.md', equals: 'fixed' },
          },
          { label: 'leave enter-key.md alone', test: { file: 'enter-key.md', equals: 'seeded' } },
        ],
        { 'return-key.md': 'typo', 'enter-key.md': 'seeded' }
      );

      const pressedX = history('x');

      // `x` pressed, but on the wrong file: the old keystroke-only check passed here.
      const wrongFile = context({
        history: pressedX,
        activeFilePath: 'return-key.md',
        file: fileMap({
          'return-key.md': { contents: ['typo'] },
          'enter-key.md': { contents: ['seede'] },
        }),
      });
      expect(passed(evaluateChecklist(lesson, wrongFile))).toEqual([false, false]);

      const correct = context({
        history: pressedX,
        activeFilePath: 'return-key.md',
        file: fileMap({
          'return-key.md': { contents: ['fixed'] },
          'enter-key.md': { contents: ['seeded'] },
        }),
      });
      expect(passed(evaluateChecklist(lesson, correct))).toEqual([true, true]);
    });
  });

  describe('latching', () => {
    it('should latch an item built only from session predicates', () => {
      const lesson = lessonWith([{ label: 'day 7', test: { cursorAt: [7, null] } }]);

      const arrived = evaluateChecklist(lesson, context({ cursor: { line: 6, col: 0 } }));
      expect(arrived).toEqual([{ passed: true, monotonic: true }]);

      // Moving on fails the raw predicate, but `monotonic` tells the runtime to keep
      // the item checked: the learner did reach the line.
      const movedOn = evaluateChecklist(lesson, context({ cursor: { line: 4, col: 0 } }));
      expect(movedOn).toEqual([{ passed: false, monotonic: true }]);
    });

    it('should mark session-only items monotonic and anything asserting state live', () => {
      const lesson = lessonWith([
        { label: 'command', test: { command: 'x' } },
        { label: 'exact command', test: { command: 'x', exact: true } },
        { label: 'open', test: { open: 'a.txt' } },
        { label: 'cursor', test: { cursorAt: [2, 3] } },
        { label: 'content', test: { file: 'a.txt', equals: 'x' } },
        { label: 'blank', test: { file: 'a.txt', blank: true } },
        { label: 'saved', test: { file: 'a.txt', saved: true } },
        { label: 'quit', test: { quit: true } },
        { label: 'mixed', test: { command: 'x', file: 'a.txt', equals: 'x' } },
      ]);

      const monotonic = evaluateChecklist(lesson, context()).map((result) => result.monotonic);

      expect(monotonic).toEqual([true, true, true, true, false, false, false, false, false]);
    });

    it('should not let file alone drag a session-only item off latching', () => {
      // `file` names a subject; it asserts nothing. An item combining it with a
      // session predicate still latches, and the neutral keys never decide.
      const lesson = lessonWith([
        { label: 'newFile marker', test: { command: ':e', file: 'new.txt', newFile: true } },
      ]);

      expect(evaluateChecklist(lesson, context())[0].monotonic).toBe(true);
    });

    it('should keep a counted command item latching, since count only tightens command', () => {
      const lesson = lessonWith([{ label: '7G', test: { command: 'G', count: 7 } }]);

      expect(evaluateChecklist(lesson, context())[0].monotonic).toBe(true);
    });
  });

  describe('evaluateWhen', () => {
    it('should defer an item when the required file is not the active buffer', () => {
      const lesson = lessonWith([
        {
          label: 'edit a.txt',
          evaluateWhen: { fileOpen: 'a.txt' },
          test: { file: 'a.txt', contains: ['hello'] },
        },
      ]);

      const result = evaluateChecklist(
        lesson,
        context({
          activeFilePath: '',
          file: fileMap({ 'a.txt': { contents: ['hello'] } }),
        })
      );

      expect(result[0].passed).toBe(false);
      expect(result[0].deferred).toBe(true);
    });

    it('should evaluate normally when the required file is the active buffer', () => {
      const lesson = lessonWith([
        {
          label: 'edit a.txt',
          evaluateWhen: { fileOpen: 'a.txt' },
          test: { file: 'a.txt', contains: ['hello'] },
        },
      ]);

      const result = evaluateChecklist(
        lesson,
        context({
          activeFilePath: 'a.txt',
          file: fileMap({ 'a.txt': { contents: ['hello'] } }),
        })
      );

      expect(result[0].passed).toBe(true);
      expect(result[0].deferred).toBeUndefined();
    });

    it('should defer until the required register content is present', () => {
      const lesson = lessonWith([
        {
          label: 'paste the paragraph',
          evaluateWhen: {
            fileOpen: 'a.txt',
            register: { equals: 'paragraph' },
          },
          test: { file: 'a.txt', contains: ['paragraph'] },
        },
      ]);

      const result = evaluateChecklist(
        lesson,
        context({
          activeFilePath: 'a.txt',
          register: { text: 'other', linewise: true },
          file: fileMap({ 'a.txt': { contents: ['paragraph'] } }),
        })
      );

      expect(result[0].passed).toBe(false);
      expect(result[0].deferred).toBe(true);
    });

    it('should evaluate when the required file and register content are present', () => {
      const lesson = lessonWith([
        {
          label: 'paste the paragraph',
          evaluateWhen: {
            fileOpen: 'a.txt',
            register: { equals: 'paragraph' },
          },
          test: { file: 'a.txt', contains: ['paragraph'] },
        },
      ]);

      const result = evaluateChecklist(
        lesson,
        context({
          activeFilePath: 'a.txt',
          register: { text: 'paragraph', linewise: true },
          file: fileMap({ 'a.txt': { contents: ['paragraph'] } }),
        })
      );

      expect(result[0].passed).toBe(true);
      expect(result[0].deferred).toBeUndefined();
    });

    it('should defer until the required file has changed, regardless of the active buffer', () => {
      const lesson = lessonWith([
        {
          label: 'edit a.txt',
          evaluateWhen: { fileChanged: 'a.txt' },
          test: { file: 'a.txt', contains: ['changed'] },
        },
      ]);

      const untouched = evaluateChecklist(
        lesson,
        context({
          activeFilePath: 'other.txt',
          file: fileMap({ 'a.txt': { contents: ['changed'] } }),
        })
      );
      const changed = evaluateChecklist(
        lesson,
        context({
          activeFilePath: 'other.txt',
          file: fileMap({ 'a.txt': { contents: ['changed'], written: true } }),
        })
      );

      expect(untouched[0].deferred).toBe(true);
      expect(changed[0].passed).toBe(true);
      expect(changed[0].deferred).toBeUndefined();
    });

    it('should defer a multi-file item until every required file has changed', () => {
      const lesson = lessonWith([
        {
          label: 'fix both files',
          evaluateWhen: { fileChanged: ['a.txt', 'b.txt'] },
          test: {
            files: ['a.txt', 'b.txt'],
            contains: ['changed'],
          },
        },
      ]);

      const oneChanged = evaluateChecklist(
        lesson,
        context({
          file: fileMap({
            'a.txt': { contents: ['changed'], written: true },
            'b.txt': { contents: ['changed'] },
          }),
        })
      );
      const bothChanged = evaluateChecklist(
        lesson,
        context({
          file: fileMap({
            'a.txt': { contents: ['changed'], written: true },
            'b.txt': { contents: ['changed'], dirty: true },
          }),
        })
      );

      expect(oneChanged[0].deferred).toBe(true);
      expect(bothChanged[0].passed).toBe(true);
      expect(bothChanged[0].deferred).toBeUndefined();
    });

    it('should require every targeted file to match its expected content', () => {
      const lesson = lessonWith([
        {
          label: 'fix both files',
          test: {
            files: ['a.txt', 'b.txt'],
            equalsByFile: { 'a.txt': 'fixed', 'b.txt': 'fixed' },
          },
        },
      ]);

      const result = evaluateChecklist(
        lesson,
        context({
          file: fileMap({
            'a.txt': { contents: ['fixed'] },
            'b.txt': { contents: ['not fixed'] },
          }),
        })
      );

      expect(result[0].passed).toBe(false);
    });

    it('should preserve monotonic classification on deferred items', () => {
      const lesson = lessonWith([
        {
          label: 'open a.txt',
          evaluateWhen: { fileOpen: 'a.txt' },
          test: { command: 'vim' },
        },
      ]);

      const result = evaluateChecklist(lesson, context({ activeFilePath: '' }));

      expect(result[0].deferred).toBe(true);
      expect(result[0].monotonic).toBe(true);
    });

    it('should not defer items without evaluateWhen', () => {
      const lesson = lessonWith([{ label: 'just a command', test: { command: 'x' } }]);

      const result = evaluateChecklist(lesson, context());

      expect(result[0].deferred).toBeUndefined();
    });

    it('should defer when the absent placeholder is still present in the file', () => {
      const lesson = lessonWith([
        {
          label: 'enter key 1',
          evaluateWhen: { fileChanged: 'a.txt', absent: '[placeholder]' },
          test: { file: 'a.txt', contains: ['/Key 1: STORM/i'] },
        },
      ]);

      const result = evaluateChecklist(
        lesson,
        context({
          file: fileMap({ 'a.txt': { contents: ['Key 1: [placeholder]'], dirty: true } }),
        })
      );

      expect(result[0].passed).toBe(false);
      expect(result[0].deferred).toBe(true);
    });

    it('should evaluate when the absent placeholder has been removed', () => {
      const lesson = lessonWith([
        {
          label: 'enter key 1',
          evaluateWhen: { fileChanged: 'a.txt', absent: '[placeholder]' },
          test: { file: 'a.txt', contains: ['/Key 1: STORM/i'] },
        },
      ]);

      const result = evaluateChecklist(
        lesson,
        context({
          file: fileMap({ 'a.txt': { contents: ['Key 1: STORM'], dirty: true } }),
        })
      );

      expect(result[0].passed).toBe(true);
      expect(result[0].deferred).toBeUndefined();
    });

    it('should defer when any absent needle is still present', () => {
      const lesson = lessonWith(
        [
          {
            label: 'enter keys',
            evaluateWhen: {
              fileChanged: 'a.txt',
              absent: ['[placeholder 1]', '[placeholder 2]'],
            },
            test: { file: 'a.txt', contains: ['done'] },
          },
        ],
        { 'a.txt': 'Key 1: [placeholder 1]\nKey 2: [placeholder 2]' }
      );

      const oneRemoved = evaluateChecklist(
        lesson,
        context({
          file: fileMap({
            'a.txt': { contents: ['Key 1: STORM', 'Key 2: [placeholder 2]'], dirty: true },
          }),
        })
      );

      expect(oneRemoved[0].deferred).toBe(true);
    });

    it('should evaluate when all absent needles have been removed', () => {
      const lesson = lessonWith(
        [
          {
            label: 'enter keys',
            evaluateWhen: {
              fileChanged: 'a.txt',
              absent: ['[placeholder 1]', '[placeholder 2]'],
            },
            test: { file: 'a.txt', contains: ['done'] },
          },
        ],
        { 'a.txt': 'Key 1: [placeholder 1]\nKey 2: [placeholder 2]' }
      );

      const bothRemoved = evaluateChecklist(
        lesson,
        context({
          file: fileMap({
            'a.txt': { contents: ['Key 1: STORM', 'Key 2: done'], dirty: true },
          }),
        })
      );

      expect(bothRemoved[0].deferred).toBeUndefined();
    });

    it('should defer when absent is set but fileChanged is not yet met', () => {
      const lesson = lessonWith([
        {
          label: 'enter key',
          evaluateWhen: { fileChanged: 'a.txt', absent: '[placeholder]' },
          test: { file: 'a.txt', contains: ['STORM'] },
        },
      ]);

      const result = evaluateChecklist(
        lesson,
        context({
          file: fileMap({ 'a.txt': { contents: ['Key 1: STORM'] } }),
        })
      );

      expect(result[0].deferred).toBe(true);
    });
  });
});

describe('quickfix predicate', () => {
  function qfContext(entryCount: number) {
    const entries = Array.from({ length: entryCount }, (_, i) => ({
      path: `file-${i}.md`,
      line: 0,
      col: 0,
      text: 'match',
    }));
    return context({ quickfix: { entries, index: 0 } });
  }

  it('should fail when the quickfix list is null', () => {
    const lesson = lessonWith([{ label: 'search', test: { quickfix: { minCount: 1 } } }]);
    const result = evaluateChecklist(lesson, context({ quickfix: null }));
    expect(result[0].passed).toBe(false);
  });

  it('should pass minCount when the list has enough entries', () => {
    const lesson = lessonWith([{ label: 'search', test: { quickfix: { minCount: 3 } } }]);
    expect(evaluateChecklist(lesson, qfContext(3))[0].passed).toBe(true);
    expect(evaluateChecklist(lesson, qfContext(5))[0].passed).toBe(true);
  });

  it('should fail minCount when the list has too few entries', () => {
    const lesson = lessonWith([{ label: 'search', test: { quickfix: { minCount: 3 } } }]);
    expect(evaluateChecklist(lesson, qfContext(2))[0].passed).toBe(false);
  });

  it('should pass count when the list has exactly the required entries', () => {
    const lesson = lessonWith([{ label: 'search', test: { quickfix: { count: 4 } } }]);
    expect(evaluateChecklist(lesson, qfContext(4))[0].passed).toBe(true);
  });

  it('should fail count when the list entry count differs', () => {
    const lesson = lessonWith([{ label: 'search', test: { quickfix: { count: 4 } } }]);
    expect(evaluateChecklist(lesson, qfContext(3))[0].passed).toBe(false);
    expect(evaluateChecklist(lesson, qfContext(5))[0].passed).toBe(false);
  });

  it('should require every quickfix entry to contain the expected text', () => {
    const lesson = lessonWith([
      { label: 'search', test: { quickfix: { count: 2, contains: 'fork' } } },
    ]);
    const matchingEntries = [
      { path: 'one.md', line: 0, col: 0, text: 'fork' },
      { path: 'two.md', line: 0, col: 0, text: 'pipe fork' },
    ];
    const nonMatchingEntries = [
      ...matchingEntries,
      { path: 'three.md', line: 0, col: 0, text: 'pipe' },
    ];

    expect(
      evaluateChecklist(lesson, context({ quickfix: { entries: matchingEntries, index: 0 } }))[0]
        .passed
    ).toBe(true);
    expect(
      evaluateChecklist(lesson, context({ quickfix: { entries: nonMatchingEntries, index: 0 } }))[0]
        .passed
    ).toBe(false);
  });

  it('should not latch — re-evaluates on every keystroke', () => {
    const lesson = lessonWith([{ label: 'search', test: { quickfix: { minCount: 1 } } }]);
    const result = evaluateChecklist(lesson, qfContext(1));
    expect(result[0].monotonic).toBe(false);
  });
});

describe('describeIncomplete', () => {
  it('should return the generic checklist message', () => {
    expect(describeIncomplete()).toContain("steps aren't done yet");
  });
});
