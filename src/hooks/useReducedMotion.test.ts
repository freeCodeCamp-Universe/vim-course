import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { ANIMATIONS_PREFERENCE_EVENT, ANIMATIONS_STORAGE_KEY } from './useAnimationsPreference';
import { useReducedMotion } from './useReducedMotion';

const mediaQueryListeners = new Set<() => void>();
const matchMedia = vi.fn(() => ({
  matches: false,
  addEventListener: (_event: string, listener: () => void) => {
    mediaQueryListeners.add(listener);
  },
  removeEventListener: (_event: string, listener: () => void) => {
    mediaQueryListeners.delete(listener);
  },
}));

afterEach(() => {
  localStorage.clear();
  mediaQueryListeners.clear();
  vi.restoreAllMocks();
});

describe('useReducedMotion', () => {
  it('should reflect the persisted in-app preference', () => {
    localStorage.setItem(ANIMATIONS_STORAGE_KEY, 'false');
    vi.stubGlobal('matchMedia', matchMedia);

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(true);
  });

  it('should update when the in-app preference event fires', () => {
    vi.stubGlobal('matchMedia', matchMedia);
    const { result } = renderHook(() => useReducedMotion());

    act(() => {
      localStorage.setItem(ANIMATIONS_STORAGE_KEY, 'false');
      window.dispatchEvent(new Event(ANIMATIONS_PREFERENCE_EVENT));
    });

    expect(result.current).toBe(true);
  });

  it('should update when the OS preference changes', () => {
    let matches = false;
    const query = {
      get matches() {
        return matches;
      },
      addEventListener: (_event: string, listener: () => void) => {
        mediaQueryListeners.add(listener);
      },
      removeEventListener: (_event: string, listener: () => void) => {
        mediaQueryListeners.delete(listener);
      },
    };
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => query)
    );
    const { result } = renderHook(() => useReducedMotion());

    act(() => {
      matches = true;
      for (const listener of mediaQueryListeners) {
        listener();
      }
    });

    expect(result.current).toBe(true);
  });
});
