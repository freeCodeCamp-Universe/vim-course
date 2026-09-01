import { useCallback, useMemo, useState } from 'react';
import { type CompletedEntry, readProgress, writeProgress } from './progressStorage';

export interface UseProgressResult {
  /** Completed lesson ids in the order they were persisted. */
  completed: string[];
  /** The id of the most recently completed lesson, determined by timestamp. */
  lastCompletedId: string | undefined;
  /** Mark a lesson complete and persist it; a no-op if already complete. */
  markComplete: (lessonId: string) => void;
}

/**
 * Reads and persists completed-lesson entries in a single localStorage key. State is
 * read synchronously on mount so the overview renders on first paint with no
 * loading state; absent, malformed, or wrong-version storage falls back to empty
 * progress without throwing. The hook is policy-agnostic: how a lesson becomes
 * complete (a workshop passing, a lab submit, a reading opening) is the caller's
 * decision — it persists whatever ids are marked.
 */
export function useProgress(): UseProgressResult {
  const [entries, setEntries] = useState<CompletedEntry[]>(readProgress);

  const completed = useMemo(() => entries.map((e) => e.id), [entries]);

  const lastCompletedId = useMemo(() => {
    if (entries.length === 0) {
      return undefined;
    }
    return entries.reduce((max, e) => (e.completedAt > max.completedAt ? e : max)).id;
  }, [entries]);

  // Read-modify-write against storage rather than the in-memory copy, so a
  // completion appends to whatever another tab may have written since this page
  // loaded. Called once per lesson completion, right before navigation.
  const markComplete = useCallback((lessonId: string) => {
    const current = readProgress();
    if (current.some((e) => e.id === lessonId)) {
      return;
    }
    const next = [...current, { id: lessonId, completedAt: Date.now() }];
    writeProgress(next);
    setEntries(next);
  }, []);

  return { completed, lastCompletedId, markComplete };
}
