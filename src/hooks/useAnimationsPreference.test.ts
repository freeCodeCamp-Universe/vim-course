import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  ANIMATIONS_PREFERENCE_EVENT,
  ANIMATIONS_STORAGE_KEY,
  REDUCED_MOTION_ATTRIBUTE,
  useAnimationsPreference,
} from './useAnimationsPreference';

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute(REDUCED_MOTION_ATTRIBUTE);
});

describe('useAnimationsPreference', () => {
  it('should default to enabled', () => {
    const { result } = renderHook(() => useAnimationsPreference());

    expect(result.current.animationsEnabled).toBe(true);
    expect(localStorage.getItem(ANIMATIONS_STORAGE_KEY)).toBe('true');
    expect(document.documentElement.hasAttribute(REDUCED_MOTION_ATTRIBUTE)).toBe(false);
  });

  it('should read and reflect a disabled preference', () => {
    localStorage.setItem(ANIMATIONS_STORAGE_KEY, 'false');

    const { result } = renderHook(() => useAnimationsPreference());

    expect(result.current.animationsEnabled).toBe(false);
    expect(document.documentElement.hasAttribute(REDUCED_MOTION_ATTRIBUTE)).toBe(true);
  });

  it('should persist changes, update the document, and dispatch the preference event', () => {
    const listener = vi.fn();
    window.addEventListener(ANIMATIONS_PREFERENCE_EVENT, listener);
    const { result } = renderHook(() => useAnimationsPreference());
    listener.mockClear();

    act(() => result.current.setAnimationsEnabled(false));

    expect(localStorage.getItem(ANIMATIONS_STORAGE_KEY)).toBe('false');
    expect(document.documentElement.hasAttribute(REDUCED_MOTION_ATTRIBUTE)).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener(ANIMATIONS_PREFERENCE_EVENT, listener);
  });
});
