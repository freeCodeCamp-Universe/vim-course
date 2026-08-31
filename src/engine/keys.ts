/**
 * Key names shared by more than one dispatch path. Everything here is a browser
 * `KeyboardEvent.key` spelling, normalized by the terminal view before it reaches
 * the engine.
 */

/** Both spellings of the escape key, since browsers disagree on the older one. */
export const ESCAPE_KEYS = new Set(['Escape', 'Esc']);

/**
 * Arrow keys are basic navigation, not a drilled command: they move the cursor
 * even in a workshop that restricts input to its taught keys.
 */
export const ARROW_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
