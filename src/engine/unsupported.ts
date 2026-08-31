import type { CommandResult } from './registry';
import { setError } from './state';
import type { EditorState } from './types';

export const DEFAULT_UNSUPPORTED_MESSAGE = '{sequence} is not supported in this lesson';
export const DEFAULT_UNSUPPORTED_MODE_MESSAGE =
  '{sequence} is not supported in {mode} in this lesson';

function formatUnsupportedMessage(template: string, sequence: string, mode?: string): string {
  return template.replaceAll('{sequence}', sequence).replaceAll('{mode}', mode ?? '');
}

/**
 * What the status line says for a key or command this course does not simulate.
 * Real Vim rings the bell instead, which a browser cannot show, and a learner who
 * gets no reaction at all reads the terminal as broken. The wording says
 * "this lesson" rather than inventing an `E` code, so it never implies Vim itself
 * would reject the key.
 */
export function unsupportedMessage(
  sequence: string,
  template = DEFAULT_UNSUPPORTED_MESSAGE
): string {
  return formatUnsupportedMessage(template, sequence);
}

/** Report `sequence` as unsupported, changing nothing else and recording no action. */
export function unsupported(state: EditorState, sequence: string): CommandResult {
  return {
    state: setError(state, unsupportedMessage(sequence, state.unsupportedMessage)),
    actions: [],
  };
}

/**
 * What the status line says for a key the course *does* simulate, just not in the
 * mode the learner is in. `p` and `u` are commands they have already been taught,
 * so the bare message above would read as "that key does not exist here" and
 * undercut the lesson that taught it. Naming the mode says which of the two is
 * true, and stays accurate about Vim: `v_p` and `v_u` are real, they are simply
 * outside this lesson.
 */
export function unsupportedInModeMessage(
  sequence: string,
  mode: string,
  template = DEFAULT_UNSUPPORTED_MODE_MESSAGE
): string {
  return formatUnsupportedMessage(template, sequence, mode);
}

/** Report `sequence` as unsupported in `mode` alone, recording no action. */
export function unsupportedInMode(
  state: EditorState,
  sequence: string,
  mode: string
): CommandResult {
  return {
    state: setError(state, unsupportedInModeMessage(sequence, mode, state.unsupportedMessage)),
    actions: [],
  };
}

/**
 * Whether an unhandled key is worth reporting: a single printable character is
 * something the learner typed as a command, while a multi-character key name is
 * hardware (`Shift`, `Home`, `F1`) that Vim ignores just as quietly.
 */
export function isReportableKey(key: string): boolean {
  return key.length === 1;
}
