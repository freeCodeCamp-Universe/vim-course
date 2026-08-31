import { useCallback, useState } from 'react';
import { getLessonReachability, type LessonReachability } from '@/curriculum/lessonOrder';
import { readProgress, writeProgress } from './progressStorage';

export interface UseProgressResult {
  /** Completed lesson ids in the order they were persisted. */
  completed: string[];
  /** Reachable / locked / frontier sets derived from `completed`. */
  reachability: LessonReachability;
  /** Mark a lesson complete and persist it; a no-op if already complete. */
  markComplete: (lessonId: string) => void;
}

/**
 * Reads and persists completed-lesson ids in a single localStorage key. State is
 * read synchronously on mount so the overview renders on first paint with no
 * loading state; absent, malformed, or wrong-version storage falls back to empty
 * progress without throwing. The hook is policy-agnostic: how a lesson becomes
 * complete (a workshop passing, a lab submit, a reading opening) is the caller's
 * decision — it persists whatever ids are marked.
 */
export function useProgress(): UseProgressResult {
  const [completed, setCompleted] = useState<string[]>(readProgress);

  // Read-modify-write against storage rather than the in-memory copy, so a
  // completion appends to whatever another tab may have written since this page
  // loaded. Called once per lesson completion, right before navigation.
  const markComplete = useCallback((lessonId: string) => {
    const current = readProgress();
    if (current.includes(lessonId)) {
      return;
    }
    const next = [...current, lessonId];
    writeProgress(next);
    setCompleted(next);
  }, []);

  return { completed, reachability: getLessonReachability(completed), markComplete };
}
