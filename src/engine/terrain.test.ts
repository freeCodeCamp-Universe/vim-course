import { describe, it, expect } from 'vitest';
import { canTraverse } from './terrain';
import type { Buffer, Cursor, TerrainRules } from './types';

function rules(entries: Record<string, string[]>): TerrainRules {
  return new Map(Object.entries(entries).map(([glyph, commands]) => [glyph, new Set(commands)]));
}

function cursor(line: number, col: number): Cursor {
  return { line, col };
}

const MAZE_RULES = rules({
  '#': [],
  '~': ['0', '$'],
  '%': ['w', 'b'],
});

describe('canTraverse', () => {
  it('should refuse l into a wall', () => {
    const buffer: Buffer = ['.#.'];
    expect(canTraverse(buffer, cursor(0, 0), cursor(0, 1), 'l', MAZE_RULES)).toBe(false);
  });

  it('should allow l into plain text', () => {
    const buffer: Buffer = ['...'];
    expect(canTraverse(buffer, cursor(0, 0), cursor(0, 1), 'l', MAZE_RULES)).toBe(true);
  });

  it('should refuse 3l whose third cell is a wall', () => {
    const buffer: Buffer = ['..#.'];
    expect(canTraverse(buffer, cursor(0, 0), cursor(0, 2), 'l', MAZE_RULES)).toBe(false);
  });

  it('should allow $ across a water strip', () => {
    const buffer: Buffer = ['.~~~.'];
    expect(canTraverse(buffer, cursor(0, 0), cursor(0, 4), '$', MAZE_RULES)).toBe(true);
  });

  it('should refuse l across a water strip', () => {
    const buffer: Buffer = ['.~~~.'];
    expect(canTraverse(buffer, cursor(0, 0), cursor(0, 1), 'l', MAZE_RULES)).toBe(false);
  });

  it('should allow w across and onto rock', () => {
    const buffer: Buffer = ['. %%% .'];
    expect(canTraverse(buffer, cursor(0, 0), cursor(0, 2), 'w', MAZE_RULES)).toBe(true);
  });

  it('should refuse j onto rock', () => {
    const buffer: Buffer = ['.', '%'];
    expect(canTraverse(buffer, cursor(0, 0), cursor(1, 0), 'j', MAZE_RULES)).toBe(false);
  });

  it('should check the target column across crossed rows for j', () => {
    //   col: 0 1 2
    // row 0:  . . .
    // row 1:  . # .
    // row 2:  . . .
    const buffer: Buffer = ['...', '.#.', '...'];
    // j from (0,1) to (2,1) crosses row 1 at col 1 which is '#'
    expect(canTraverse(buffer, cursor(0, 1), cursor(2, 1), 'j', MAZE_RULES)).toBe(false);
    // j from (0,0) to (2,0) crosses row 1 at col 0 which is '.'
    expect(canTraverse(buffer, cursor(0, 0), cursor(2, 0), 'j', MAZE_RULES)).toBe(true);
  });

  it('should never refuse anything with an empty rules map', () => {
    const buffer: Buffer = ['#~%'];
    const empty = rules({});
    expect(canTraverse(buffer, cursor(0, 0), cursor(0, 2), 'l', empty)).toBe(true);
  });

  it('should allow movement when cursor does not move', () => {
    const buffer: Buffer = ['#'];
    expect(canTraverse(buffer, cursor(0, 0), cursor(0, 0), 'l', MAZE_RULES)).toBe(true);
  });

  it('should allow h moving backward through plain text', () => {
    const buffer: Buffer = ['...'];
    expect(canTraverse(buffer, cursor(0, 2), cursor(0, 0), 'h', MAZE_RULES)).toBe(true);
  });

  it('should refuse h moving backward into a wall', () => {
    const buffer: Buffer = ['.#.'];
    expect(canTraverse(buffer, cursor(0, 2), cursor(0, 0), 'h', MAZE_RULES)).toBe(false);
  });

  it('should allow k upward through plain text', () => {
    const buffer: Buffer = ['.', '.', '.'];
    expect(canTraverse(buffer, cursor(2, 0), cursor(0, 0), 'k', MAZE_RULES)).toBe(true);
  });

  it('should refuse k upward through a wall', () => {
    const buffer: Buffer = ['.', '#', '.'];
    expect(canTraverse(buffer, cursor(2, 0), cursor(0, 0), 'k', MAZE_RULES)).toBe(false);
  });

  it('should use reading order for w crossing lines', () => {
    // w from end of line 0 to start of line 2, crossing line 1 which has a wall
    const buffer: Buffer = ['hello', '#', 'world'];
    expect(canTraverse(buffer, cursor(0, 4), cursor(2, 0), 'w', MAZE_RULES)).toBe(false);
  });

  it('should use reading order for b crossing lines backward', () => {
    const buffer: Buffer = ['hello', '#', 'world'];
    expect(canTraverse(buffer, cursor(2, 0), cursor(0, 4), 'b', MAZE_RULES)).toBe(false);
  });

  it('should allow w landing on rock (rock is passable by w)', () => {
    const buffer: Buffer = ['. %%%'];
    expect(canTraverse(buffer, cursor(0, 0), cursor(0, 2), 'w', MAZE_RULES)).toBe(true);
  });

  it('should allow 0 landing on water (water is passable by 0)', () => {
    const buffer: Buffer = ['~~.'];
    expect(canTraverse(buffer, cursor(0, 2), cursor(0, 0), '0', MAZE_RULES)).toBe(true);
  });
});
