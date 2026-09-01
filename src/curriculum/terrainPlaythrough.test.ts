import { describe, expect, it } from 'vitest';
import type { EditorState } from '@/engine';
import { buildCurriculum, type OrderingModule } from './loader';
import { curriculum as defaultOrdering } from './ordering';
import type { AuthoredLessonDefinition } from './types';
import { isAuthoredLesson, isProseLesson } from './types';
import { vimLessonEngine, type AllowedInput } from './lessonEngine';

const MAZE_ID = '6a8f2e7c4b1d3a9e5f0c8d72';

/**
 * Load the curriculum with the maze lesson's WIP flag stripped so it is fully
 * parsed and validated instead of returned as a prose placeholder. Other WIP
 * lessons keep their flag so incomplete content elsewhere doesn't blow up.
 */
const MAZE_FILE = 'lesson-10.md';

const allLessonsMarkdown: Record<string, string> = import.meta.glob('./**/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

const mazeUnwippedOrdering: OrderingModule[] = defaultOrdering.map((mod) => ({
  ...mod,
  lessons: mod.lessons.map((entry) => {
    if (typeof entry === 'object' && entry.file === MAZE_FILE) {
      return entry.file;
    }
    return entry;
  }),
}));

const fullCurriculum = buildCurriculum(allLessonsMarkdown, mazeUnwippedOrdering);
const mazeLesson = fullCurriculum.lessons.find(
  (lesson) => lesson.id === MAZE_ID && isAuthoredLesson(lesson)
) as AuthoredLessonDefinition;

/**
 * Feed keys and track checklist completion with latching, the way the runtime
 * does. A monotonic item stays completed once it passes, so a `cursorReached` test
 * that passed on step 3 still counts on step 14.
 */
function feedWithLatching(
  state: EditorState,
  keys: readonly string[],
  lesson: AuthoredLessonDefinition,
  allowed?: AllowedInput
): { state: EditorState; passed: boolean[] } {
  const latched = lesson.config.checklist.map(() => false);
  let s = state;

  for (const key of keys) {
    s = vimLessonEngine.feed(s, key, allowed).state;
    const results = vimLessonEngine.checkRequirements(s, lesson);
    results.forEach((result, index) => {
      if (result.passed) {
        latched[index] = true;
      }
    });
  }

  return { state: s, passed: latched };
}

describe('terrain maze playthrough', () => {
  it('should load the maze lesson from real curriculum', () => {
    expect(mazeLesson).toBeDefined();
    expect(isProseLesson(mazeLesson)).toBe(false);
    expect(mazeLesson.config.terrain).toBeDefined();
  });

  it('should refuse walking into a wall', () => {
    const allowed = vimLessonEngine.allowedInput(mazeLesson);
    const state = vimLessonEngine.seed(mazeLesson);

    // The start position is (0,0). Below at (1,0) is '#' (wall).
    const result = vimLessonEngine.feed(state, 'j', allowed);
    expect(result.state.cursor).toEqual(state.cursor);
    expect(result.announcement).toContain('wall');
  });

  it('should solve the maze with a hand-authored key sequence', () => {
    const allowed = vimLessonEngine.allowedInput(mazeLesson);
    const state = vimLessonEngine.seed(mazeLesson);

    // Route (0-based positions):
    //   $ → (0,8)    end of row 0
    //   j → (1,8)    right edge of wall row
    //   j → (2,8)    row 2
    //   0 → (2,0)    start of row 2      → checkpoint 1: cursorReached [3,1]
    //   j → (3,0)    water row, col 0 (safe)
    //   $ → (3,8)    end of water row    → checkpoint 2: cursorReached [4,9]
    //   j → (4,8)    clear row
    //   h → (4,7)    step left
    //   h → (4,6)    step left
    //   j → (5,6)    rock row, col 6 ('.')
    //   b → (5,4)    land on '%' (b permitted)
    //   b → (5,2)    land on '%' (b permitted)
    //   b → (5,0)    start of row 5      → checkpoint 3: cursorReached [6,1]
    //   j → (6,0)    exit row = 'E'      → checkpoint 4: cursorReached [7,1]
    const solution = [
      '$',
      'j',
      'j',
      '0', // around the wall
      'j',
      '$', // across the water
      'j',
      'h',
      'h',
      'j', // down to rock row
      'b',
      'b',
      'b', // past the rocks
      'j', // to the exit
    ];

    const { passed } = feedWithLatching(state, solution, mazeLesson, allowed);
    const labels = mazeLesson.config.checklist.map((r) => r.label);

    passed.forEach((p, index) => {
      expect(p, `"${labels[index]}" should pass`).toBe(true);
    });
  });
});
