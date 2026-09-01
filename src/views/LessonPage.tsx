import { useCallback, useRef, useState } from 'react';
import { isProseLesson, type LessonDefinition } from '@/curriculum/types';
import { extractHeadings } from '@/utils/extractHeadings';
import { LessonToolbar } from '@/components/features/LessonToolbar';
import { Outline } from '@/components/features/Outline';
import { LessonWorkspace, type TabId } from './LessonWorkspace';
import styles from './LessonPage.module.css';

export interface LessonPageProps {
  lesson: LessonDefinition;
  orderedLessonIds: string[];
  /** Pre-rendered instruction HTML, produced at build time by renderMarkdown. */
  instructionsHtml: string;
  /** Pre-rendered HTML per instruction segment (prose lessons with tab blocks). */
  segmentHtmls?: string[];
}

/**
 * Wrapping island for a lesson page. Renders the toolbar above the workspace
 * and owns the tab state shared between them. For prose lessons, also renders
 * a table-of-contents outline (drawer on mobile, toggleable sidebar on desktop).
 */
export function LessonPage({ lesson, orderedLessonIds, instructionsHtml, segmentHtmls }: LessonPageProps) {
  const prose = isProseLesson(lesson);
  const [tab, setTab] = useState<TabId>('instructions');

  const [outlineOpen, setOutlineOpen] = useState(false);
  const outlineButtonRef = useRef<HTMLButtonElement | null>(null);

  // isProseLesson narrows lesson to ProseLessonDefinition, giving access to
  // instructionSegments. Re-call the guard here so TypeScript sees the narrowing.
  const headings = isProseLesson(lesson)
    ? extractHeadings(
        lesson.instructionSegments
          ? lesson.instructionSegments
              .filter((s): s is { kind: 'markdown'; content: string } => s.kind === 'markdown')
              .map((s) => s.content)
              .join('\n')
          : lesson.instructions
      )
    : [];

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
          <LessonWorkspace lesson={lesson} orderedLessonIds={orderedLessonIds} instructionsHtml={instructionsHtml} segmentHtmls={segmentHtmls} tab={tab} onSelectTab={selectTab} />
        </div>
      ) : (
        <LessonWorkspace lesson={lesson} orderedLessonIds={orderedLessonIds} instructionsHtml={instructionsHtml} segmentHtmls={segmentHtmls} tab={tab} onSelectTab={selectTab} />
      )}
    </div>
  );
}
