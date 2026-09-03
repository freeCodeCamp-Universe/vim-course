import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { isProseLesson, type ClientLessonDefinition } from '@/curriculum/types';
import { useCurriculumTree } from '@/curriculum/useCurriculumTree';
import { useCourseShortcuts } from '@/hooks/useCourseShortcuts';
import { useLesson } from '@/hooks/useLesson';
import { useInitialFocusPreference } from '@/hooks/useInitialFocusPreference';
import { useShortcutsPreference } from '@/hooks/useShortcutsPreference';
import { useProgress } from '@/hooks/useProgress';
import { useCourseChrome } from '@/stores/courseChrome';
import { CheckCircleIcon } from '@/components/base/Icon';
import { Markdown } from '@/components/base/Markdown/Markdown';
import { renderInline } from '@/components/base/Markdown/renderInline';
import { TabGroup } from '@/components/base/TabGroup/TabGroup';
import { Checklist } from '@/components/features/Checklist';
import { PrimaryAction } from '@/components/features/PrimaryAction';
import { ResetButton } from '@/components/features/ResetButton';
import { VimTerminal } from '@/components/features/VimTerminal';
import styles from './LessonWorkspace.module.css';

export type TabId = 'instructions' | 'terminal';

export interface LessonWorkspaceProps {
  lesson: ClientLessonDefinition;
  /** The next lesson in course order, computed at build time. Undefined on the last lesson. */
  nextLessonId?: string;
  /** Whether this is the final lesson in the course. */
  isLastLesson: boolean;
  /** Pre-rendered instruction HTML, produced at build time by renderMarkdown. */
  instructionsHtml: string;
  /**
   * Pre-rendered HTML for each instruction segment (prose lessons with tab
   * blocks). Indices correspond 1:1 to `lesson.instructionSegments`; tab-group
   * segments have an empty string since they are rendered by `<TabGroup>`.
   */
  segmentHtmls?: string[];
  /** Which panel is active. Owned by the parent (LessonPage). */
  tab: TabId;
  /** Called when the user switches panels via keyboard shortcut. */
  onSelectTab: (tab: TabId) => void;
}

/**
 * The two-region lesson workspace: instructions (prose, checklist, and feedback)
 * beside the terminal and its fixed action footer on wide screens, collapsing to
 * two tabs below 768px. Prose lessons (those with no `# --config--` section)
 * render prose-only at every width with a
 * plain Next control and no terminal, checklist, or Reset. On load, focus
 * lands on the lesson heading so the task is announced.
 */
export function LessonWorkspace({
  lesson,
  nextLessonId,
  isLastLesson,
  instructionsHtml,
  segmentHtmls,
  tab,
  onSelectTab,
}: LessonWorkspaceProps) {
  const [, navigate] = useLocation();
  const chrome = useCourseChrome();
  const tree = useCurriculumTree();
  const { shortcutsEnabled } = useShortcutsPreference();
  const { focusInstructionsOnLoad } = useInitialFocusPreference();
  const { completed, markComplete } = useProgress();
  const { checklist, complete, feedback, onUpdate, viewRef, reportIncomplete, reset } =
    useLesson(lesson);

  const prose = isProseLesson(lesson);
  const [tabAnnouncement, setTabAnnouncement] = useState('');
  const [shortcutNote, setShortcutNote] = useState('');
  const pendingTerminalFocus = useRef(false);
  const pendingInstructionsFocus = useRef(false);
  const instructionsRef = useRef<HTMLElement>(null);
  const isFirstTabRender = useRef(true);

  // Focus the terminal or the instructions panel on mount for interactive lessons.
  // Prose lessons leave focus unmanaged (the page heading gets browser default focus).
  // The preference lets screen reader users land on the instructions panel so they
  // hear the task before engaging the terminal.
  //
  // Focus is deferred by two animation frames. Under Astro, React hydrated
  // pre-existing server-rendered DOM and element.focus() worked synchronously in
  // the effect. With client-side routing the entire subtree is created dynamically
  // after an async data fetch, and the browser needs at least one full
  // render-and-paint cycle to finalize layout before it will honor a programmatic
  // focus call on the new elements. A double-rAF guarantees the first paint has
  // completed: the outer callback fires after the current frame's paint, and the
  // inner callback fires after the next, by which point layout is stable.
  useEffect(() => {
    if (prose) {
      return;
    }

    let cancelled = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) {
          return;
        }
        if (focusInstructionsOnLoad) {
          instructionsRef.current?.focus();
        } else {
          viewRef.current?.focus();
        }
      });
    });
    return () => {
      cancelled = true;
    };
  }, [prose, focusInstructionsOnLoad, viewRef]);

  const isCompleted = completed.includes(lesson.id);

  // markComplete persists synchronously before the navigation so the next page
  // reads fresh progress.
  const advance = useCallback(() => {
    markComplete(lesson.id);
    navigate(isLastLesson || !nextLessonId ? '/' : `/learn/${nextLessonId}`);
  }, [markComplete, lesson.id, isLastLesson, nextLessonId, navigate]);

  // Announce tab changes to screen readers, skipping the initial render.
  useEffect(() => {
    if (isFirstTabRender.current) {
      isFirstTabRender.current = false;
      return;
    }
    setTabAnnouncement(tab === 'terminal' ? 'terminal' : 'instructions');
  }, [tab]);

  // Alt+1: reveal the terminal on the tabbed layout, then move focus into it once
  // the panel is displayed (a hidden panel cannot take focus synchronously).
  const focusTerminal = useCallback(() => {
    if (tab === 'terminal') {
      viewRef.current?.focus();
      return;
    }
    pendingTerminalFocus.current = true;
    onSelectTab('terminal');
  }, [tab, onSelectTab, viewRef]);

  useEffect(() => {
    if (tab === 'terminal' && pendingTerminalFocus.current) {
      pendingTerminalFocus.current = false;
      viewRef.current?.focus();
    }
  }, [tab, viewRef]);

  // Alt+2: reveal the instructions panel on the tabbed layout, then focus it.
  const focusInstructions = useCallback(() => {
    if (tab === 'instructions') {
      instructionsRef.current?.focus();
      return;
    }
    pendingInstructionsFocus.current = true;
    onSelectTab('instructions');
  }, [tab, onSelectTab]);

  useEffect(() => {
    if (tab === 'instructions' && pendingInstructionsFocus.current) {
      pendingInstructionsFocus.current = false;
      instructionsRef.current?.focus();
    }
  }, [tab]);

  const announceShortcut = useCallback((message: string) => {
    // Append a zero-width space to a repeated message so the polite region re-announces.
    setShortcutNote((prev) => (prev === message ? `${message}\u200b` : message));
  }, []);

  // Keyboard shortcuts use the full ordered lesson list for Alt+N/Alt+P stepping.
  // The list arrives from the static JSON endpoint; an empty array is a safe
  // fallback while the fetch is in flight (shortcuts announce "no next lesson").
  useCourseShortcuts({
    currentLessonId: lesson.id,
    reachableLessonIds: tree?.orderedLessonIds ?? [],
    onNavigate: (lessonId) => {
      navigate(`/learn/${lessonId}`);
    },
    onFocusTerminal: prose ? () => {} : focusTerminal,
    onFocusInstructions: prose ? () => {} : focusInstructions,
    onOpenDrawer: chrome.openDrawer,
    onOpenShortcuts: chrome.openShortcuts,
    announce: announceShortcut,
    enabled:
      shortcutsEnabled && !chrome.drawerOpen && !chrome.shortcutsOpen && !chrome.settingsOpen,
  });

  const shortcutRegion = (
    <div className="sr-only" role="status" aria-live="polite">
      {shortcutNote}
    </div>
  );

  const heading = (
    <h1 id="lesson-heading" className={styles.heading}>
      {isCompleted && (
        <>
          <CheckCircleIcon className={styles['heading-status']} />
          <span className="sr-only">completed</span>
        </>
      )}
      <span>{renderInline(lesson.title)}</span>
    </h1>
  );

  if (prose) {
    const segments = lesson.instructionSegments;

    return (
      <>
        <main
          id="main"
          tabIndex={-1}
          className={`${styles['prose-page']} ${lesson.type === 'review' ? styles['review-page'] : ''}`}
          aria-labelledby="lesson-heading"
        >
          <div className={lesson.type === 'review' ? styles['review-content'] : ''}>
            {heading}
            {segments && segmentHtmls ? (
              segments.map((segment, index) =>
                segment.kind === 'markdown' ? (
                  <Markdown key={index} html={segmentHtmls[index]} />
                ) : (
                  <TabGroup key={index} tabs={segment.tabs} />
                )
              )
            ) : (
              <Markdown html={instructionsHtml} />
            )}
            <div className={styles.controls}>
              <PrimaryAction complete={complete} isCapstone={isLastLesson} onAdvance={advance} />
            </div>
          </div>
        </main>
        {shortcutRegion}
      </>
    );
  }

  return (
    <>
      <main id="main" tabIndex={-1} className={styles.page} data-tab={tab}>
        {/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- scrollable panel is an intentional tab stop, same as the terminal */}
        <section
          ref={instructionsRef}
          tabIndex={0}
          className={styles.instructions}
          aria-labelledby="lesson-heading"
        >
          {heading}
          <div className={styles['instruction-body']}>
            <Markdown html={instructionsHtml} />
            <Checklist items={checklist} muteAnnouncement={feedback !== null} />
          </div>
          <div className={styles.feedback} role="status" aria-live="polite">
            {feedback}
          </div>
        </section>
        {/* eslint-enable jsx-a11y/no-noninteractive-tabindex */}

        <div className={styles.terminal}>
          <VimTerminal lesson={lesson} onUpdate={onUpdate} viewRef={viewRef} />
          <div className={styles.controls}>
            <ResetButton onReset={reset} />
            <PrimaryAction
              complete={complete}
              isCapstone={isLastLesson}
              onAdvance={advance}
              onBlocked={reportIncomplete}
            />
          </div>
        </div>

        <div className="sr-only" role="status" aria-live="polite">
          {tabAnnouncement}
        </div>
      </main>
      {shortcutRegion}
    </>
  );
}
