/**
 * A content needle for `contains`/`absent` is a plain substring by default, or a
 * `/pattern/flags` literal that is matched as a regular expression over the whole
 * joined file text. The regex form is what lets an author assert order across
 * lines ("X after Y") that a per-line `line.matches` cannot express.
 *
 * Shared so the runtime checks in `statePasses`, the load-time regex validation,
 * and the pristine-seed guard in `seedAlreadySatisfies` all read a needle by
 * exactly the same rule.
 */
const NEEDLE_REGEX_FORM = /^\/(.+)\/([gimsuy]*)$/;

/**
 * The regex source and flags of a `/pattern/flags` needle, or `null` when the
 * needle is a plain substring.
 */
export function parseNeedleRegex(needle: string): { source: string; flags: string } | null {
  const match = needle.match(NEEDLE_REGEX_FORM);
  return match ? { source: match[1], flags: match[2] } : null;
}

/** Whether `text` satisfies a needle: regex test for the `/pattern/flags` form, substring otherwise. */
export function matchNeedle(needle: string, text: string): boolean {
  const regex = parseNeedleRegex(needle);
  if (regex) {
    return new RegExp(regex.source, regex.flags).test(text);
  }
  return text.includes(needle);
}
