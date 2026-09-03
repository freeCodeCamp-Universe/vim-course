import { useCallback, useEffect, useRef, useState } from 'react';
import { isProseLesson, type ClientLessonDefinition } from '@/curriculum/types';
import type { Heading } from '@/utils/extractHeadings';
import { LessonToolbar } from '@/components/features/LessonToolbar';
import { Outline } from '@/components/features/Outline';
import { LessonWorkspace, type TabId } from './LessonWorkspace';
import styles from './LessonPage.module.css';

export interface LessonPageProps {
  lesson: ClientLessonDefinition;
  /** The next lesson in course order, computed at build time. Undefined on the last lesson. */
  nextLessonId?: string;
  /** Whether this is the final lesson in the course. */
  isLastLesson: boolean;
  /** Pre-rendered instruction HTML, produced at build time by renderMarkdown. */
  instructionsHtml: string;
  /** Pre-rendered HTML per instruction segment (prose lessons with tab blocks). */
  segmentHtmls?: string[];
  /** Table-of-contents headings, pre-computed at build time from the raw markdown. */
  headings: Heading[];
}

/**
 * Wrapping island for a lesson page. Renders the toolbar above the workspace
 * and owns the tab state shared between them. For prose lessons, also renders
 * a table-of-contents outline (drawer on mobile, toggleable sidebar on desktop).
 */
export function LessonPage({ lesson, nextLessonId, isLastLesson, instructionsHtml, segmentHtmls, headings }: LessonPageProps) {
  const prose = isProseLesson(lesson);
  const [tab, setTab] = useState<TabId>('instructions');

  useEffect(() => {
    document.title = `${lesson.title} | Vim Course | freeCodeCamp.org`;
  }, [lesson.title]);

  const [outlineOpen, setOutlineOpen] = useState(false);
  const outlineButtonRef = useRef<HTMLButtonElement | null>(null);

  const selectTab = useCallback((next: TabId) => {
    setTab(next);
  }, []);

  const toggleOutline = useCallback(() => {
    setOutlineOpen((prev) => !prev);
  }, []);

  const closeOutline = useCallback(() => {
    setOutlineOpen(false);
  }, []);

  // For prose lessons, the toolbar only contains the Outline button. If there
  // are no headings to show, the toolbar has no content and should be hidden.
  const showToolbar = !prose || headings.length > 0;

  return (
    <div className={styles.wrapper} data-lesson-page>
      {showToolbar && (
        <LessonToolbar
          lesson={lesson}
          tab={tab}
          onSelectTab={selectTab}
          outlineOpen={outlineOpen}
          onOutlineToggle={toggleOutline}
          outlineButtonRef={outlineButtonRef}
        />
      )}
      {prose ? (
        <div className={styles['prose-area']}>
          <Outline
            id="lesson-outline"
            headings={headings}
            open={outlineOpen}
            onClose={closeOutline}
            triggerElement={outlineButtonRef.current}
          />
          <LessonWorkspace lesson={lesson} nextLessonId={nextLessonId} isLastLesson={isLastLesson} instructionsHtml={instructionsHtml} segmentHtmls={segmentHtmls} tab={tab} onSelectTab={selectTab} />
        </div>
      ) : (
        <LessonWorkspace lesson={lesson} nextLessonId={nextLessonId} isLastLesson={isLastLesson} instructionsHtml={instructionsHtml} segmentHtmls={segmentHtmls} tab={tab} onSelectTab={selectTab} />
      )}
    </div>
  );
}
