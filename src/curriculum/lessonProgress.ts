import type { RequirementResult } from '@/validation/checklist';
import type { AllowedInput, LessonEngine } from '@/curriculum/lessonEngine';
import { isProseLesson, type LessonDefinition } from '@/curriculum/types';

export type ChecklistStatus = 'not-done' | 'completed' | 'error';

export interface ChecklistItem {
  label: string;
  labelTemplate?: string;
  /** The authored nudge for this item, if it has one. */
  hint?: string;
  /**
   * When true, the hint is shown even when the checklist just advanced to this
   * item. Copied from the authored `hintOnAdvance` on the requirement.
   */
  hintOnAdvance?: boolean;
  attemptsBeforeHint?: number;
  /** True while a missed item's hint is visible. */
  showHint: boolean;
  attempts?: number;
  status: ChecklistStatus;
  /**
   * Present only on items whose authored requirement has `evaluateWhen`. `true`
   * when the condition was not met on the last evaluation pass, so the test was
   * skipped; `false` when the condition is met and evaluation ran normally.
   * Tracked so that a keystroke that simultaneously satisfies the condition
   * (e.g. Enter opening the file) and counts as an attempt does not immediately
   * reveal the hint. Items without `evaluateWhen` never carry this field.
   */
  deferred?: boolean;
  count?: number;
  total?: number;
}

/**
 * Everything one keystroke produces: the advanced engine state, its polite
 * announcement, and the graded checklist. This is the whole of the lesson
 * runtime's state, so a view layer only has to render it and hand the next key
 * back to {@link advanceProgress}.
 */
export interface LessonProgress<TState> {
  state: TState;
  announcement: string;
  checklist: readonly ChecklistItem[];
  complete: boolean;
}

function interpolateLabel(template: string, count: number, total: number): string {
  return template.replace('{count}', String(count)).replace('{total}', String(total));
}

function initChecklist(lesson: LessonDefinition): ChecklistItem[] {
  if (isProseLesson(lesson)) {
    return [];
  }

  return lesson.config.checklist.map((item) => {
    const cursorAt = item.test.cursorAt;
    const total =
      cursorAt !== undefined && Array.isArray(cursorAt[0]) ? cursorAt.length : undefined;
    const isDynamicLabel = total !== undefined && /\{count\}|\{total\}/.test(item.label);

    return {
      label: isDynamicLabel ? interpolateLabel(item.label, 0, total) : item.label,
      ...(isDynamicLabel ? { labelTemplate: item.label, count: 0, total } : {}),
      hint: item.hint,
      ...(item.hintOnAdvance ? { hintOnAdvance: true } : {}),
      ...(item.attemptsBeforeHint !== undefined
        ? { attemptsBeforeHint: item.attemptsBeforeHint }
        : {}),
      showHint: false,
      status: 'not-done',
      ...(item.attemptsBeforeHint !== undefined ? { attempts: 0 } : {}),
      ...(item.evaluateWhen !== undefined ? { deferred: false } : {}),
    };
  });
}

/** Apply failed, debounced target-line attempts to their checklist items. */
export function settleChecklistAttempts<TState>(
  progress: LessonProgress<TState>,
  indexes: readonly number[],
  results: readonly RequirementResult[]
): LessonProgress<TState> {
  const attempted = new Set(indexes);
  let changed = false;
  const checklist = progress.checklist.map((item, index) => {
    if (
      !attempted.has(index) ||
      item.attempts === undefined ||
      item.status === 'completed' ||
      results[index]?.deferred ||
      results[index]?.passed
    ) {
      return item;
    }

    const nextAttempts = item.attempts + 1;
    const showHint =
      item.hint !== undefined &&
      item.attemptsBeforeHint !== undefined &&
      nextAttempts >= item.attemptsBeforeHint;
    if (nextAttempts === item.attempts && showHint === item.showHint) {
      return item;
    }
    changed = true;
    return { ...item, attempts: nextAttempts, showHint: item.showHint || showHint };
  });

  return changed
    ? { ...progress, checklist, complete: checklist.every((item) => item.status === 'completed') }
    : progress;
}

/**
 * Apply one round of requirement results to the checklist. Each result declares
 * whether it may be latched. A monotonic item (a keystroke or one-way flag) stays
 * `completed` once it passes, since its predicate can never become false again. A
 * non-monotonic item (one asserting current file or editor state) mirrors its
 * result in both directions, so removing the text returns it to `not-done`,
 * clearing any `error` a blocked advance left behind.
 *
 * A pass that changes nothing returns the original array, so its identity is
 * stable across a run of keystrokes that move no item.
 */
function gradeChecklist(
  checklist: readonly ChecklistItem[],
  results: readonly RequirementResult[],
  missed: boolean
): readonly ChecklistItem[] {
  let changed = false;
  const next = checklist.map((item, index) => {
    const result = results[index];
    const status: ChecklistStatus =
      (result.monotonic || result.deferred) && item.status === 'completed'
        ? 'completed'
        : result.passed
          ? 'completed'
          : 'not-done';
    const showHint = status === 'completed' ? false : item.showHint;
    // Only items with evaluateWhen (indicated by deferred being present from init)
    // track deferral state. For all other items, deferred stays undefined.
    const hasEvaluateWhen = item.deferred !== undefined;
    const deferred = hasEvaluateWhen ? result.deferred === true : undefined;
    const count = result.count;
    const total = result.total;
    const label =
      count !== undefined && total !== undefined && item.labelTemplate !== undefined
        ? interpolateLabel(item.labelTemplate, count, total)
        : item.label;
    const countChanged = count !== undefined && count !== item.count;
    const totalChanged = total !== undefined && total !== item.total;
    const labelChanged = label !== item.label;
    const deferredChanged = hasEvaluateWhen && deferred !== item.deferred;

    if (
      status === item.status &&
      showHint === item.showHint &&
      !countChanged &&
      !totalChanged &&
      !labelChanged &&
      !deferredChanged
    ) {
      return item;
    }
    changed = true;
    return {
      ...item,
      label,
      status,
      showHint,
      ...(hasEvaluateWhen ? { deferred } : {}),
      ...(count !== undefined ? { count } : {}),
      ...(total !== undefined ? { total } : {}),
    };
  });

  // A finished attempt that left the current item incomplete is a miss, and
  // reveals that item's hint. The current item is the first one still open, so
  // the hint always sits under the step the learner is actually stuck on.
  // A keystroke that just advanced the checklist (completed a prior item) is a
  // success, not a miss for the newly-current item.
  // A deferred item (evaluateWhen not yet met) suppresses its hint — the learner
  // is still in a prerequisite phase and has not reached this step. The check uses
  // the *previous* deferred state so that a keystroke that simultaneously satisfies
  // the evaluateWhen condition (e.g. Enter opening the file) and is an attempt does
  // not immediately fire the hint.
  const prevCurrent = checklist.findIndex((item) => item.status !== 'completed');
  const current = next.findIndex((item) => item.status !== 'completed');
  const advanced = current !== prevCurrent;
  const progressed = next.some(
    (item, index) => item.status === 'completed' && checklist[index]?.status !== 'completed'
  );
  const wasDeferred = current !== -1 && checklist[current]?.deferred === true;
  const isDeferred = current !== -1 && results[current].deferred === true;
  const hintTriggered =
    (!progressed && missed && !advanced) || (advanced && next[current]?.hintOnAdvance);
  if (
    hintTriggered &&
    !wasDeferred &&
    !isDeferred &&
    current !== -1 &&
    next[current].hint &&
    !next[current].showHint
  ) {
    next[current] = { ...next[current], showHint: true };
    changed = true;
  }

  return changed ? next : checklist;
}

function toProgress<TState>(
  state: TState,
  announcement: string,
  checklist: readonly ChecklistItem[]
): LessonProgress<TState> {
  return {
    state,
    announcement,
    checklist,
    complete: checklist.every((item) => item.status === 'completed'),
  };
}

/**
 * The pristine progress for a lesson: seeded engine state, one checklist entry
 * per requirement, and an immediate grading pass so an item a lesson starts out
 * satisfying is already `completed` on first render. A prose lesson has no
 * requirements, so its empty checklist counts as complete.
 */
export function seedProgress<TState>(
  lesson: LessonDefinition,
  engine: LessonEngine<TState>
): LessonProgress<TState> {
  const state = engine.seed(lesson);
  const checklist = gradeChecklist(
    initChecklist(lesson),
    engine.checkRequirements(state, lesson),
    false
  );
  return toProgress(state, '', checklist);
}

/** Regrade the current state after an edit that did not come through a key. */
export function regradeProgress<TState>(
  prev: LessonProgress<TState>,
  lesson: LessonDefinition,
  engine: LessonEngine<TState>,
  visitedPositions?: ReadonlySet<string> | null
): LessonProgress<TState> {
  const checklist = gradeChecklist(
    prev.checklist,
    engine.checkRequirements(prev.state, lesson, visitedPositions),
    false
  );
  return toProgress(prev.state, prev.announcement, checklist);
}

/**
 * Feed one input key to the engine and regrade the checklist against the state it
 * produced. A keystroke that finished an attempt at a command (`attempted`) and
 * still left the current item open reveals that item's hint.
 */
export function advanceProgress<TState>(
  prev: LessonProgress<TState>,
  key: string,
  lesson: LessonDefinition,
  engine: LessonEngine<TState>,
  allowedInput?: AllowedInput,
  visitedPositions?: ReadonlySet<string> | null,
  onStateAdvanced?: (state: TState) => void
): LessonProgress<TState> {
  const fed = engine.feed(prev.state, key, allowedInput);
  onStateAdvanced?.(fed.state);
  const checklist = gradeChecklist(
    prev.checklist,
    engine.checkRequirements(fed.state, lesson, visitedPositions),
    fed.attempted
  );

  return toProgress(fed.state, fed.announcement, checklist);
}

/**
 * Grade the whole checklist as missed, for a learner who tried to leave a lesson
 * unfinished: every still-open item is its own miss, so each flips to `error` and
 * reveals its own hint rather than only the first one. The next
 * {@link advanceProgress} regrades them, so the error state clears as soon as the
 * learner gets back to work.
 */
export function gradeIncomplete<TState>(prev: LessonProgress<TState>): LessonProgress<TState> {
  let changed = false;
  const checklist = prev.checklist.map<ChecklistItem>((item) => {
    if (item.status === 'completed') {
      return item;
    }

    const showHint = item.showHint || item.hint !== undefined;
    if (item.status === 'error' && showHint === item.showHint) {
      return item;
    }

    changed = true;
    return { ...item, status: 'error', showHint };
  });

  return toProgress(prev.state, prev.announcement, changed ? checklist : prev.checklist);
}

/**
 * The three progress transitions bound to one lesson and engine, with the input
 * filter captured once. The state-owning terminal controller is the primary
 * caller, so this keeps the input filter, visited-position set, and state update
 * hook out of ordinary call sites.
 */
export interface LessonProgressController<TState> {
  /** The pristine progress: seeded state, graded checklist, no announcement. */
  seed(): LessonProgress<TState>;
  /** Advance by one input key, applying the captured input filter. */
  advance(
    prev: LessonProgress<TState>,
    key: string,
    visitedPositions?: ReadonlySet<string> | null,
    onStateAdvanced?: (state: TState) => void
  ): LessonProgress<TState>;
  /** Grade every open item as a miss, for a learner leaving a lesson unfinished. */
  gradeIncomplete(prev: LessonProgress<TState>): LessonProgress<TState>;
}

export function createLessonProgress<TState>(
  lesson: LessonDefinition,
  engine: LessonEngine<TState>
): LessonProgressController<TState> {
  const allowedInput = engine.allowedInput(lesson);
  return {
    seed: () => seedProgress(lesson, engine),
    advance: (prev, key, visitedPositions, onStateAdvanced) =>
      advanceProgress(prev, key, lesson, engine, allowedInput, visitedPositions, onStateAdvanced),
    gradeIncomplete,
  };
}
