import { useCallback, useEffect, useRef, useState } from 'react';
import { orderedLessonIds } from '@/curriculum/lessonOrder';
import { isProseLesson, type LessonDefinition } from '@/curriculum/types';
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
  lesson: LessonDefinition;
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
export function LessonWorkspace({ lesson, tab, onSelectTab }: LessonWorkspaceProps) {
  const chrome = useCourseChrome();
  const { shortcutsEnabled } = useShortcutsPreference();
  const { focusInstructionsOnLoad } = useInitialFocusPreference();
  const { completed, markComplete, reachability } = useProgress();
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
  useEffect(() => {
    if (!prose) {
      if (focusInstructionsOnLoad) {
        instructionsRef.current?.focus();
      } else {
        viewRef.current?.focus();
      }
    }
  }, [prose, focusInstructionsOnLoad, viewRef]);

  const currentIndex = orderedLessonIds.indexOf(lesson.id);
  const nextId = orderedLessonIds[currentIndex + 1];
  const isCapstone = currentIndex === orderedLessonIds.length - 1;
  const isCompleted = completed.includes(lesson.id);

  // Lesson-to-lesson movement is a real document load, so navigation is a
  // location change and the next page load is the reset that a router remount used
  // to provide. markComplete persists synchronously before the navigation is
  // dispatched, so the next page reads fresh progress.
  const advance = useCallback(() => {
    markComplete(lesson.id);
    window.location.href = isCapstone || !nextId ? '/' : `/learn/${nextId}`;
  }, [markComplete, lesson.id, isCapstone, nextId]);

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

  useCourseShortcuts({
    currentLessonId: lesson.id,
    reachableLessonIds: reachability.reachableLessonIds,
    onNavigate: (lessonId) => {
      window.location.href = `/learn/${lessonId}`;
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
            {segments ? (
              segments.map((segment, index) =>
                segment.kind === 'markdown' ? (
                  <Markdown key={index}>{segment.content}</Markdown>
                ) : (
                  <TabGroup key={index} tabs={segment.tabs} />
                )
              )
            ) : (
              <Markdown>{lesson.instructions}</Markdown>
            )}
            <div className={styles.controls}>
              <PrimaryAction complete={complete} isCapstone={isCapstone} onAdvance={advance} />
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
            <Markdown>{lesson.instructions}</Markdown>
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
              isCapstone={isCapstone}
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
