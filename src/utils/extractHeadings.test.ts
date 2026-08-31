import { describe, expect, it } from 'vitest';
import { extractHeadings, slugify } from './extractHeadings';

describe('slugify', () => {
  it('should lowercase and replace spaces with hyphens', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('should strip non-alphanumeric characters except hyphens', () => {
    expect(slugify('The `x` command')).toBe('the-x-command');
    expect(slugify('Hello **World**')).toBe('hello-world');
    expect(slugify("What's this?")).toBe('whats-this');
  });

  it('should collapse multiple spaces into one hyphen', () => {
    expect(slugify('Hello   World')).toBe('hello-world');
  });

  it('should preserve existing hyphens', () => {
    expect(slugify('insert-mode')).toBe('insert-mode');
  });
});

describe('extractHeadings', () => {
  it('should return an empty array for markdown with no headings', () => {
    expect(extractHeadings('Just some prose.')).toEqual([]);
  });

  it('should extract H2 headings', () => {
    const result = extractHeadings('## Modes\n\nSome text.');
    expect(result).toEqual([{ level: 2, text: 'Modes', id: 'modes' }]);
  });

  it('should extract H3 headings', () => {
    const result = extractHeadings('### Insert Mode\n\nSome text.');
    expect(result).toEqual([{ level: 3, text: 'Insert Mode', id: 'insert-mode' }]);
  });

  it('should extract both H2 and H3 in source order', () => {
    const md = '## Overview\n\n### Section A\n\n## Summary';
    const result = extractHeadings(md);
    expect(result).toEqual([
      { level: 2, text: 'Overview', id: 'overview' },
      { level: 3, text: 'Section A', id: 'section-a' },
      { level: 2, text: 'Summary', id: 'summary' },
    ]);
  });

  it('should ignore H1 headings', () => {
    expect(extractHeadings('# Title\n\n## Section')).toEqual([
      { level: 2, text: 'Section', id: 'section' },
    ]);
  });

  it('should ignore H4 and deeper headings', () => {
    expect(extractHeadings('## Section\n\n#### Deep')).toEqual([
      { level: 2, text: 'Section', id: 'section' },
    ]);
  });

  it('should generate slugs for headings with inline code syntax', () => {
    const result = extractHeadings('## The `x` command');
    expect(result).toEqual([{ level: 2, text: 'The `x` command', id: 'the-x-command' }]);
  });
});
