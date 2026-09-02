import { useCallback, useRef, useState, type RefObject } from 'react';
import { vimLessonEngine } from '@/curriculum/lessonEngine';
import { createLessonProgress, type ChecklistItem } from '@/curriculum/lessonProgress';
import type { LessonSnapshot, VimTerminalView } from '@/terminal/vimTerminalView';
import type { ClientLessonDefinition } from '@/curriculum/types';

export interface UseLessonResult {
  /** One entry per checklist label, `not-done` until a validator flips it. */
  checklist: readonly ChecklistItem[];
  /** True once every checklist item is completed (the lesson may be left). */
  complete: boolean;
  /** Whether the active buffer has diverged from its seed, for the Reset control. */
  dirty: boolean;
  /** True when there is anything to reset: dirty buffer OR shell output accumulated. */
  resettable: boolean;
  /** Guidance after a blocked attempt to advance; null until then, cleared on reset. */
  feedback: string | null;
  /** Hand to the terminal so each advance pushes its snapshot into the sidebar. */
  onUpdate: (snapshot: LessonSnapshot) => void;
  /** Hand to the terminal so it can register the mounted view here. */
  viewRef: RefObject<VimTerminalView | null>;
  /** Restore the pristine seed + checklist and return focus to the terminal. */
  reset: () => void;
  /**
   * Report that the learner tried to leave an unfinished lesson: mark the open
   * items as missed, reveal their hints, and surface the explanatory feedback.
   */
  reportIncomplete: () => void;
}

/** The seed snapshot, computed synchronously so the sidebar never flashes empty. */
function seedSnapshot(lesson: ClientLessonDefinition): LessonSnapshot {
  const progress = createLessonProgress(lesson, vimLessonEngine).seed();
  return {
    checklist: progress.checklist,
    complete: progress.complete,
    dirty: progress.state.dirty,
    resettable: false,
  };
}

/**
 * The sidebar half of the lesson runtime. The terminal owns the engine state and
 * grades the checklist itself (see {@link createVimTerminalView}); this hook is a
 * subscriber. It seeds the snapshot so the first paint is correct, mirrors every
 * later snapshot the terminal pushes through {@link onUpdate}, and delegates the
 * two side-effecting controls — Reset and the too-early-advance grade — to the
 * mounted view through {@link viewRef}. It holds no engine state of its own.
 */
export function useLesson(lesson: ClientLessonDefinition): UseLessonResult {
  const [snapshot, setSnapshot] = useState<LessonSnapshot>(() => seedSnapshot(lesson));
  const [feedback, setFeedback] = useState<string | null>(null);
  const viewRef = useRef<VimTerminalView | null>(null);

  const reset = useCallback(() => {
    viewRef.current?.reset();
    setFeedback(null);
  }, []);

  const reportIncomplete = useCallback(() => {
    setFeedback(viewRef.current?.reportIncomplete() ?? null);
  }, []);

  // Clear stale feedback whenever the terminal pushes a new snapshot (the
  // learner typed something). During `reportIncomplete`, `emit()` calls
  // `onUpdate` *before* `setFeedback(string)` in the same synchronous
  // callback, so React batches the two `setFeedback` calls and the later
  // non-null one wins — feedback is set correctly on the validation render and
  // cleared on the next keystroke.
  const onUpdate = useCallback((snap: LessonSnapshot) => {
    setSnapshot(snap);
    setFeedback(null);
  }, []);

  return {
    checklist: snapshot.checklist,
    complete: snapshot.complete,
    dirty: snapshot.dirty,
    resettable: snapshot.resettable,
    feedback,
    onUpdate,
    viewRef,
    reset,
    reportIncomplete,
  };
}
