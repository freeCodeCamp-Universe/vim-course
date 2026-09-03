import type { ReactNode } from 'react';
import { Link, useRoute } from 'wouter';
import { HeaderControls } from '@/components/features/HeaderControls';
import { CourseOverlays } from '@/components/features/CourseOverlays';
import styles from './CourseLayout.module.css';

interface Props {
  children: ReactNode;
}

export function CourseLayout({ children }: Props) {
  const [isLesson, params] = useRoute('/learn/:lessonId');
  const currentLessonId = isLesson ? params.lessonId : undefined;

  return (
    <>
      <a href="#main" className="sr-only">Skip to main content</a>
      <header className={styles.header}>
        <Link href="/" className={styles['home-link']}>Vim Course</Link>
        <HeaderControls
          showDrawer={Boolean(currentLessonId)}
          showShortcuts={Boolean(currentLessonId)}
        />
      </header>
      {children}
      <CourseOverlays currentLessonId={currentLessonId} />
    </>
  );
}
