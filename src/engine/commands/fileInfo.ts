import { normalModeRegistry } from '../registry';
import { setStatus } from '../state';
import type { EditorState } from '../types';

/**
 * The `Ctrl-G` message: the file name, the cursor's 1-based line, the total line
 * count, how far through the file that line sits, and the cursor's 1-based
 * column. The percentage is `floor(line * 100 / total)`, Vim's own integer
 * formula, so line 1 of a long file reads as a low number and the last line reads
 * as `100%`. `[Modified]` follows the file name only for a dirty buffer; Vim's
 * `[New]` marker for an unwritten path is out of scope, since lesson files are
 * seeded on disk.
 */
export function fileInfoMessage(state: EditorState): string {
  const line = state.cursor.line + 1;
  const total = state.buffer.length;
  const percent = Math.floor((line * 100) / total);
  const modified = state.dirty ? ' [Modified]' : '';
  return `"${state.activeFilePath}"${modified} line ${line} of ${total} --${percent}%-- col ${state.cursor.col + 1}`;
}

/**
 * `Ctrl-G` reports the cursor's position on the message line and edits nothing.
 * It records a `motion` action so a checklist can latch on the keystroke: the
 * command matcher skips only `insert` actions, and `Ctrl-g` collides with no
 * other command name.
 */
normalModeRegistry.register('Ctrl-g', ({ state }) => ({
  state: setStatus(state, fileInfoMessage(state)),
  actions: [{ type: 'motion', command: 'Ctrl-g' }],
}));
