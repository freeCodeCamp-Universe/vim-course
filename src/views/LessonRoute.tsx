import { useParams } from 'react-router';
import { LessonPage } from './LessonPage';
import { useLessonData } from '@/hooks/useLessonData';
import { LoadingState } from '@/components/base/LoadingState/LoadingState';

export function LessonRoute() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { data, loading, error } = useLessonData(lessonId ?? '');

  if (loading || !data) {
    return <LoadingState label="Loading lesson" />;
  }

  if (error) {
    return (
      <main id="main" tabIndex={-1}>
        <p>Lesson not found.</p>
      </main>
    );
  }

  return (
    <LessonPage
      key={data.lesson.id}
      lesson={data.lesson}
      nextLessonId={data.nextLessonId}
      isLastLesson={data.isLastLesson}
      instructionsHtml={data.instructionsHtml}
      segmentHtmls={data.segmentHtmls}
      headings={data.headings}
    />
  );
}
