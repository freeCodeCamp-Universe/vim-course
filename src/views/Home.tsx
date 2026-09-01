import { useMemo } from 'react';
import { Button } from '@/components/base/Button/Button';
import { CurriculumNavigator } from '@/components/features/CurriculumNavigator';
import type { CurriculumTreeModule } from '@/components/features/CurriculumTree';
import { Progress } from '@/components/base/Progress/Progress';
import { useProgress } from '@/hooks/useProgress';
import styles from './Home.module.css';

interface Props {
  modules: CurriculumTreeModule[];
  orderedLessonIds: string[];
}

export function Home({ modules, orderedLessonIds }: Props) {
  const { completed, lastCompletedId } = useProgress();

  const completedSet = useMemo(() => {
    const lessonIds = new Set(orderedLessonIds);
    return new Set(completed.filter((id) => lessonIds.has(id)));
  }, [completed, orderedLessonIds]);

  // The lesson to resume from:
  //   - Not started: first lesson in course order.
  //   - In progress: lesson after the most recently completed one, falling back to
  //     the frontier when the next sequential lesson doesn't exist (e.g. the user
  //     completed the last lesson but has gaps earlier in the course).
  //   - Last completed lesson no longer in curriculum: fall back to first uncompleted.
  //   - All available lessons done: undefined — button is hidden.
  const continueId = useMemo(() => {
    const completedIds = new Set(completed);
    const frontier = orderedLessonIds.find((id) => !completedIds.has(id));

    if (lastCompletedId === undefined) {
      return frontier ?? orderedLessonIds[0];
    }

    const idx = orderedLessonIds.indexOf(lastCompletedId);
    if (idx === -1) {
      return frontier;
    }

    return orderedLessonIds[idx + 1] ?? frontier;
  }, [lastCompletedId, completed, orderedLessonIds]);

  const hasStarted = lastCompletedId !== undefined;

  return (
    <div data-home-page>
      <Progress completed={completedSet.size} total={orderedLessonIds.length} />
      {continueId !== undefined && (
        <div className={styles['cta-row']}>
          <Button variant="cta" href={`/learn/${continueId}`} className={styles['cta-button']}>
            {hasStarted ? 'Continue' : 'Start learning'}
          </Button>
        </div>
      )}
      <CurriculumNavigator
        modules={modules}
        variant="home"
        lessonState={(id) => (completedSet.has(id) ? 'completed' : 'available')}
      />
    </div>
  );
}
