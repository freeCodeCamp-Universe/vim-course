import type { ReactNode } from 'react';
import { Link, useMatch } from 'react-router';
import { HeaderControls } from '@/components/features/HeaderControls';
import { CourseOverlays } from '@/components/features/CourseOverlays';
import styles from './CourseLayout.module.css';

interface Props {
  children: ReactNode;
}

export function CourseLayout({ children }: Props) {
  const lessonMatch = useMatch('/learn/:lessonId');
  const currentLessonId = lessonMatch?.params.lessonId;

  return (
    <>
      <a href="#main" className="sr-only">Skip to main content</a>
      <header className={styles.header}>
        <Link to="/" className={styles['home-link']}>Vim Course</Link>
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
