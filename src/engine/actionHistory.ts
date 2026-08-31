import type { Mode } from './types';

/**
 * Structured records describing what a keystroke did. Workshop validators
 * (Task 19) observe this log to detect that a taught command executed; lab
 * validators (Task 20) compare buffer state instead. The `type` union grows as
 * later tasks add command families (motion, edit, ex, search, …).
 */
export type ActionType =
  'motion' | 'edit' | 'insert' | 'mode' | 'command-line' | 'ex' | 'search' | 'filtered' | 'blocked';

export interface Action {
  type: ActionType;
  /** The command that produced this action, e.g. `w`, `dd`, `:wq`. */
  command?: string;
  /** The resolved numeric count, when one was applied. */
  count?: number;
}

/**
 * Side-channel from `dispatch` to checklist: the cursor position (0-based) at
 * the time each action was produced. Keyed on Action object identity, so the
 * lookup survives array copies but not deep clones (history never deep-clones).
 * Engine tests that assert on history shapes never see this, which is the point.
 */
export const actionCursors = new WeakMap<Action, { line: number; col: number }>();
export const actionModes = new WeakMap<Action, Mode>();
/** Side-channel for commands whose completion is observational, not an attempt. */
export const actionAttempts = new WeakMap<Action, boolean>();

export function appendActions(history: readonly Action[], actions: readonly Action[]): Action[] {
  return actions.length === 0 ? [...history] : [...history, ...actions];
}
