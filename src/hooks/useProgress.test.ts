import { afterEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { orderedLessonIds } from '@/curriculum/lessonOrder';
import { useProgress } from './useProgress';

const STORAGE_KEY = 'vim-course:progress';

afterEach(() => {
  localStorage.clear();
});

describe('useProgress', () => {
  it('should start empty with every lesson reachable and the first as frontier when storage is absent', () => {
    const { result } = renderHook(() => useProgress());

    expect(result.current.completed).toEqual([]);
    expect(result.current.reachability.frontierLessonId).toBe(orderedLessonIds[0]);
    expect(result.current.reachability.reachableLessonIds).toEqual(orderedLessonIds);
  });

  it('should read completed ids persisted in storage on mount', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, completed: [orderedLessonIds[0]] })
    );

    const { result } = renderHook(() => useProgress());

    expect(result.current.completed).toEqual([orderedLessonIds[0]]);
    expect(result.current.reachability.frontierLessonId).toBe(orderedLessonIds[1]);
  });

  it('should persist a newly completed lesson across a remount', () => {
    const { result, unmount } = renderHook(() => useProgress());

    act(() => result.current.markComplete(orderedLessonIds[0]));
    expect(result.current.completed).toEqual([orderedLessonIds[0]]);

    unmount();
    const { result: remounted } = renderHook(() => useProgress());

    expect(remounted.current.completed).toEqual([orderedLessonIds[0]]);
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, completed: 'nope' }));

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
