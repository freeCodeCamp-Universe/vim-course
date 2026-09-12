import type { ReactNode } from 'react';
import { Link, useRoute } from 'wouter';
import { Banner } from '@/components/base/Banner/Banner';
import { HeaderControls } from '@/components/features/HeaderControls';
import { CourseOverlays } from '@/components/features/CourseOverlays';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import styles from './CourseLayout.module.css';

interface Props {
  children: ReactNode;
}

export function CourseLayout({ children }: Props) {
  const [isLesson, params] = useRoute('/learn/:lessonId');
  const currentLessonId = isLesson ? params.lessonId : undefined;
  const isTouch = useMediaQuery('(hover: none)');

  return (
    <>
      <a href="#main" className="sr-only">Skip to main content</a>
      <div className={styles['top-bar']}>
        <header className={styles.header}>
          <Link href="/" className={styles['home-link']}>Vim Course</Link>
          <HeaderControls
            showDrawer={Boolean(currentLessonId)}
            showShortcuts={Boolean(currentLessonId)}
          />
        </header>
        {isTouch && !currentLessonId && (
          <Banner dismissible={false}>
            This course requires a desktop keyboard. Virtual mobile keyboards do not support
            the full layout needed for some lessons.
          </Banner>
        )}
      </div>
      {children}
      <CourseOverlays currentLessonId={currentLessonId} />
    </>
  );
}
