import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { orderedLessonIds } from '@/curriculum/lessonOrder';
import { useProgress } from './useProgress';

const STORAGE_KEY = 'vim-course:progress';

afterEach(() => {
  localStorage.clear();
  vi.useRealTimers();
});

describe('useProgress', () => {
  it('should start empty with every lesson reachable and the first as frontier when storage is absent', () => {
    const { result } = renderHook(() => useProgress());

    expect(result.current.completed).toEqual([]);
    expect(result.current.lastCompletedId).toBeUndefined();
    expect(result.current.reachability.frontierLessonId).toBe(orderedLessonIds[0]);
    expect(result.current.reachability.reachableLessonIds).toEqual(orderedLessonIds);
  });

  it('should read completed ids persisted in v2 storage on mount', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 2,
        completed: [{ id: orderedLessonIds[0], completedAt: 1000 }],
      })
    );

    const { result } = renderHook(() => useProgress());

    expect(result.current.completed).toEqual([orderedLessonIds[0]]);
    expect(result.current.lastCompletedId).toBe(orderedLessonIds[0]);
    expect(result.current.reachability.frontierLessonId).toBe(orderedLessonIds[1]);
  });

  it('should migrate v1 progress (plain string array) to entries, preserving order via index-based timestamps', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, completed: [orderedLessonIds[0], orderedLessonIds[2]] })
    );

    const { result } = renderHook(() => useProgress());

    expect(result.current.completed).toEqual([orderedLessonIds[0], orderedLessonIds[2]]);
    // Index 1 (orderedLessonIds[2]) has a higher timestamp (2) than index 0 (orderedLessonIds[0] = 0)
    expect(result.current.lastCompletedId).toBe(orderedLessonIds[2]);
  });

  it('should return the most recently completed lesson by timestamp, not array position', () => {
    // Seed with an out-of-time-order array: l[1] completed last despite being first in array
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 2,
        completed: [
          { id: orderedLessonIds[1], completedAt: 2000 },
          { id: orderedLessonIds[0], completedAt: 1000 },
        ],
      })
    );

    const { result } = renderHook(() => useProgress());

    expect(result.current.lastCompletedId).toBe(orderedLessonIds[1]);
  });

  it('should persist a newly completed lesson across a remount', () => {
    vi.useFakeTimers();
    vi.setSystemTime(5000);

    const { result, unmount } = renderHook(() => useProgress());

    act(() => result.current.markComplete(orderedLessonIds[0]));
    expect(result.current.completed).toEqual([orderedLessonIds[0]]);

    unmount();
    const { result: remounted } = renderHook(() => useProgress());

    expect(remounted.current.completed).toEqual([orderedLessonIds[0]]);
    expect(remounted.current.lastCompletedId).toBe(orderedLessonIds[0]);
  });

  it('should stamp the current time on markComplete', () => {
    vi.useFakeTimers();
    vi.setSystemTime(42000);

    const { result } = renderHook(() => useProgress());
    act(() => result.current.markComplete(orderedLessonIds[0]));

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(stored.version).toBe(2);
    expect(stored.completed[0]).toEqual({ id: orderedLessonIds[0], completedAt: 42000 });
  });

  it('should ignore a lesson already marked complete', () => {
    const { result } = renderHook(() => useProgress());

    act(() => result.current.markComplete(orderedLessonIds[0]));
    const settled = result.current.completed;

    act(() => result.current.markComplete(orderedLessonIds[0]));

    expect(result.current.completed).toBe(settled);
    expect(result.current.completed).toEqual([orderedLessonIds[0]]);
  });

  it('should fall back to empty progress when storage is malformed JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json');

    const { result } = renderHook(() => useProgress());

    expect(result.current.completed).toEqual([]);
  });

  it('should fall back to empty progress when the stored shape is wrong', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, completed: 'nope' }));

    const { result } = renderHook(() => useProgress());

    expect(result.current.completed).toEqual([]);
  });

  it('should fall back to empty progress when the stored version does not match', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 99, completed: [orderedLessonIds[0]] })
    );

    const { result } = renderHook(() => useProgress());

    expect(result.current.completed).toEqual([]);
  });
});
