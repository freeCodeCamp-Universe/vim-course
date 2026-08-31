import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { AuthoredLessonDefinition, ProseLessonDefinition } from '@/curriculum/types';
import type { LessonSnapshot, VimTerminalView } from '@/terminal/vimTerminalView';
import { useLesson } from './useLesson';

const workshop: AuthoredLessonDefinition = {
  id: 'w1',
  module: 4,
  lesson: 1,
  title: 'Delete a character',
  instructions: 'delete a character',
  type: 'learn',
  files: { 'colors.txt': 'hello\nworld' },
  config: {
    start: 'file',
    open: 'colors.txt',
    cursor: [1, 1],
    allowedCommands: ['x'],
    checklist: [{ label: 'Delete a character with x', test: { command: 'x' } }],
  },
};

const prose: ProseLessonDefinition = {
  id: 'p1',
  module: 1,
  lesson: 1,
  title: 'Intro',
  type: 'intro',
  instructions: 'hello',
};

/** A view stub that records delegation without a real terminal. */
function stubView(overrides: Partial<VimTerminalView> = {}): VimTerminalView {
  return {
    el: document.createElement('div'),
    focus: () => true,
    reset: () => {},
    reportIncomplete: () => '',
    destroy: () => {},
    ...overrides,
  };
}

describe('useLesson', () => {
  it('should seed the checklist and completion from the lesson before any snapshot arrives', () => {
    const { result } = renderHook(() => useLesson(workshop));

    expect(result.current.checklist).toEqual([
      { label: 'Delete a character with x', hint: undefined, showHint: false, status: 'not-done' },
    ]);
    expect(result.current.complete).toBe(false);
    expect(result.current.dirty).toBe(false);
    expect(result.current.feedback).toBeNull();
  });

  it('should seed a prose lesson complete with an empty checklist', () => {
    const { result } = renderHook(() => useLesson(prose));

    expect(result.current.checklist).toEqual([]);
    expect(result.current.complete).toBe(true);
  });

  it('should mirror a snapshot the terminal pushes through onUpdate', () => {
    const { result } = renderHook(() => useLesson(workshop));

    const snapshot: LessonSnapshot = {
      checklist: [{ label: 'Delete a character with x', showHint: false, status: 'completed' }],
      complete: true,
      dirty: true,
      resettable: true,
    };
    act(() => result.current.onUpdate(snapshot));

    expect(result.current.checklist[0].status).toBe('completed');
    expect(result.current.complete).toBe(true);
    expect(result.current.dirty).toBe(true);
  });

  it('should surface the terminal explanation as feedback on reportIncomplete', () => {
    const { result } = renderHook(() => useLesson(workshop));
    result.current.viewRef.current = stubView({ reportIncomplete: () => 'finish the checklist' });

    act(() => result.current.reportIncomplete());

    expect(result.current.feedback).toBe('finish the checklist');
  });

  it('should delegate reset to the view and clear feedback', () => {
    const { result } = renderHook(() => useLesson(workshop));
    const reset = vi.fn();
    result.current.viewRef.current = stubView({ reset, reportIncomplete: () => 'x' });

    act(() => result.current.reportIncomplete());
    expect(result.current.feedback).toBe('x');

    act(() => result.current.reset());

    expect(reset).toHaveBeenCalledOnce();
    expect(result.current.feedback).toBeNull();
  });

  it('should clear feedback when the terminal pushes the next snapshot', () => {
    const { result } = renderHook(() => useLesson(workshop));
    result.current.viewRef.current = stubView({ reportIncomplete: () => 'x' });

    act(() => result.current.reportIncomplete());
    expect(result.current.feedback).toBe('x');

    const snapshot: LessonSnapshot = {
      checklist: [{ label: 'Delete a character with x', showHint: false, status: 'not-done' }],
      complete: false,
      dirty: false,
      resettable: false,
    };
    act(() => result.current.onUpdate(snapshot));

    expect(result.current.feedback).toBeNull();
  });

  it('should not throw when reset or reportIncomplete run before the view mounts', () => {
    const { result } = renderHook(() => useLesson(workshop));

    expect(() => act(() => result.current.reset())).not.toThrow();
    expect(() => act(() => result.current.reportIncomplete())).not.toThrow();
    expect(result.current.feedback).toBeNull();
  });
});
