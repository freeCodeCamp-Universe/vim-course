/**
 * Drop insignificant whitespace so a `normalizeWhitespace` `equals` compares only
 * the significant content: trailing whitespace is trimmed off each line and blank
 * (empty or whitespace-only) lines are removed. Indentation and spacing between
 * words are left untouched, so joining two lines or reindenting one still shows up
 * as a difference.
 *
 * Shared so the runtime comparison in `statePasses` and the load-time pristine-seed
 * guard in `seedAlreadySatisfies` normalize by exactly the same rule.
 */
export function normalizeWhitespace(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''))
    .filter((line) => line !== '')
    .join('\n');
}
