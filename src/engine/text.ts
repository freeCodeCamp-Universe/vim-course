/**
 * String helpers whose indexes count grapheme clusters rather than UTF-16
 * units, so combining marks stay attached to the character they modify.
 */
const graphemeSegmenter =
  typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;

export function textChars(text: string): string[] {
  return graphemeSegmenter
    ? Array.from(graphemeSegmenter.segment(text), ({ segment }) => segment)
    : Array.from(text);
}

export function textLength(text: string): number {
  return textChars(text).length;
}

export function textAt(text: string, index: number): string | undefined {
  return textChars(text)[index];
}

export function textSlice(text: string, start?: number, end?: number): string {
  return textChars(text).slice(start, end).join('');
}

export function isSingleCharacter(text: string): boolean {
  return textChars(text).length === 1;
}
