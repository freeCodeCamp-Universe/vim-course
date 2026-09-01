import { useEffect, useMemo, useRef, useState } from 'react';
import { loadCurriculum } from '@/curriculum/loader';
import { useProgress } from '@/hooks/useProgress';
import {
  type CurriculumTreeLessonState,
  type CurriculumTreeModule,
} from '@/components/features/CurriculumTree';
import { Progress } from '@/components/base/Progress/Progress';
import { CurriculumNavigator } from '@/components/features/CurriculumNavigator';
import { CurriculumSearch } from '@/components/features/CurriculumSearch';
import { Drawer } from '@/components/base/Drawer/Drawer';

export interface NavDrawerProps {
  /** Whether the drawer is shown. Owned by the parent (header button / `Alt+K`). */
  open: boolean;
  /** Close the drawer; the parent flips `open` to false. */
  onClose: () => void;
  /** Module/lesson view-model. Defaults to the loaded curriculum; tests inject a fixture. */
  modules?: CurriculumTreeModule[];
  /** Lesson currently open, used for the drawer's current indicator. */
  currentLessonId?: string;
  /** Element to restore focus to on close. Forwarded to Drawer/Modal. */
  triggerElement?: HTMLElement | null;
}

function buildNavModules(): CurriculumTreeModule[] {
  const { modules, lessons } = loadCurriculum();
  const titleById = new Map(lessons.map((lesson) => [lesson.id, lesson.title]));
  return modules.map((module, index) => ({
    number: index + 1,
    slug: module.slug,
    title: module.title,
    lessons: module.lessonIds.map((id) => ({ id, title: titleById.get(id) ?? id })),
  }));
}

export function NavDrawer({
  open,
  onClose,
  modules,
  currentLessonId,
  triggerElement,
}: NavDrawerProps) {
  const resolvedModules = useMemo(() => modules ?? buildNavModules(), [modules]);
  const currentLessonRef = useRef<HTMLAnchorElement | null>(null);
  const [query, setQuery] = useState('');
  const { completed } = useProgress();

  useEffect(() => {
    if (!open) {
      setQuery('');
    }
  }, [open]);

  const completedSet = useMemo(() => {
    const ids = resolvedModules.flatMap((module) => module.lessons.map((lesson) => lesson.id));
    return new Set(ids.filter((id) => completed.includes(id)));
  }, [resolvedModules, completed]);
  const totalLessons = resolvedModules.reduce((total, module) => total + module.lessons.length, 0);

  function lessonState(id: string): CurriculumTreeLessonState {
    if (id === currentLessonId) {
      return completedSet.has(id) ? 'completed-current' : 'current';
    }
    if (completedSet.has(id)) {
      return 'completed';
    }
    return 'available';
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      slideFrom="end"
      title="Lessons"
      subtitle={<Progress completed={completedSet.size} total={totalLessons} />}
      headerContent={<CurriculumSearch query={query} onQueryChange={setQuery} />}
      triggerElement={triggerElement}
      initialFocus={currentLessonId ? currentLessonRef : undefined}
    >
      <Drawer.Body>
        <CurriculumNavigator
          modules={resolvedModules}
          variant="drawer"
          query={query}
          onQueryChange={setQuery}
          showSearch={false}
          lessonState={lessonState}
          onLessonClick={onClose}
          currentLessonRef={currentLessonRef}
        />
      </Drawer.Body>
    </Drawer>
  );
}
