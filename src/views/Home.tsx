import { useMemo } from 'react';
import { CurriculumNavigator } from '@/components/features/CurriculumNavigator';
import type { CurriculumTreeModule } from '@/components/features/CurriculumTree';
import { Progress } from '@/components/base/Progress/Progress';
import { useProgress } from '@/hooks/useProgress';

interface Props {
  modules: CurriculumTreeModule[];
  orderedLessonIds: string[];
}

export function Home({ modules, orderedLessonIds }: Props) {
  const { completed } = useProgress();
  const completedSet = useMemo(() => {
    const lessonIds = new Set(orderedLessonIds);
    return new Set(completed.filter((id) => lessonIds.has(id)));
  }, [completed, orderedLessonIds]);

  return (
    <>
      <Progress completed={completedSet.size} total={orderedLessonIds.length} />
      <CurriculumNavigator
        modules={modules}
        variant="home"
        lessonState={(id) => (completedSet.has(id) ? 'completed' : 'available')}
      />
    </>
  );
}
