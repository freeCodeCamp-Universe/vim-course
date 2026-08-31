import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  SHORTCUTS_PREFERENCE_EVENT,
  SHORTCUTS_STORAGE_KEY,
  useShortcutsPreference,
} from './useShortcutsPreference';

afterEach(() => {
  localStorage.clear();
});

describe('useShortcutsPreference', () => {
  it('should default to enabled', () => {
    const { result } = renderHook(() => useShortcutsPreference());

    expect(result.current.shortcutsEnabled).toBe(true);
    expect(localStorage.getItem(SHORTCUTS_STORAGE_KEY)).toBe('true');
  });

  it('should read and reflect a disabled preference', () => {
    localStorage.setItem(SHORTCUTS_STORAGE_KEY, 'false');

    const { result } = renderHook(() => useShortcutsPreference());

    expect(result.current.shortcutsEnabled).toBe(false);
  });

  it('should persist changes and dispatch the preference event', () => {
    const listener = vi.fn();
    window.addEventListener(SHORTCUTS_PREFERENCE_EVENT, listener);
    const { result } = renderHook(() => useShortcutsPreference());
    listener.mockClear();

    act(() => result.current.setShortcutsEnabled(false));

    expect(localStorage.getItem(SHORTCUTS_STORAGE_KEY)).toBe('false');
    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener(SHORTCUTS_PREFERENCE_EVENT, listener);
  });

  it('should update when the preference event fires', () => {
    const { result } = renderHook(() => useShortcutsPreference());

    act(() => {
      localStorage.setItem(SHORTCUTS_STORAGE_KEY, 'false');
      window.dispatchEvent(new Event(SHORTCUTS_PREFERENCE_EVENT));
    });

    expect(result.current.shortcutsEnabled).toBe(false);
  });
});
