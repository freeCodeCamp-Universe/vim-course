import { describe, expect, it } from 'vitest';

import { filterVisibleCurriculum, type CurriculumContent } from './loader';
import type { LessonDefinition } from './types';

function createLesson(id: string, module: number, wip = false): LessonDefinition {
  return {
    id,
    module,
    lesson: 1,
    type: 'learn',
    title: id,
    instructions: '',
    wip,
  };
}

function createModule(
  module: number,
  slug: string,
  lessonIds: string[],
  wip = false
): CurriculumContent['modules'][number] {
  return { module, slug, title: slug, lessonIds, wip };
}

describe('filterVisibleCurriculum', () => {
  it('should return the same content when upcoming lessons are shown', () => {
    const content: CurriculumContent = {
      lessons: [createLesson('wip-lesson', 1, true)],
      modules: [createModule(1, 'upcoming', ['wip-lesson'], true)],
    };

    expect(filterVisibleCurriculum(content, true)).toBe(content);
  });

  it('should remove a whole WIP module and its lessons', () => {
    const content: CurriculumContent = {
      lessons: [createLesson('wip-lesson', 1, true), createLesson('live-lesson', 2)],
      modules: [
        createModule(1, 'upcoming', ['wip-lesson'], true),
        createModule(2, 'live', ['live-lesson']),
      ],
    };

    const visible = filterVisibleCurriculum(content, false);

    expect(visible.lessons.map((lesson) => lesson.id)).toEqual(['live-lesson']);
    expect(visible.modules.map((module) => module.slug)).toEqual(['live']);
  });

  it('should remove a WIP lesson while keeping its module and siblings', () => {
    const content: CurriculumContent = {
      lessons: [createLesson('wip-lesson', 1, true), createLesson('live-lesson', 1)],
      modules: [createModule(1, 'mixed', ['wip-lesson', 'live-lesson'])],
    };

    const visible = filterVisibleCurriculum(content, false);

    expect(visible.lessons.map((lesson) => lesson.id)).toEqual(['live-lesson']);
    expect(visible.modules[0].lessonIds).toEqual(['live-lesson']);
  });

  it('should remove a non-WIP module when every lesson is WIP', () => {
    const content: CurriculumContent = {
      lessons: [createLesson('wip-one', 1, true), createLesson('wip-two', 1, true)],
      modules: [createModule(1, 'upcoming-lessons', ['wip-one', 'wip-two'])],
    };

    const visible = filterVisibleCurriculum(content, false);

    expect(visible.lessons).toEqual([]);
    expect(visible.modules).toEqual([]);
  });
});
