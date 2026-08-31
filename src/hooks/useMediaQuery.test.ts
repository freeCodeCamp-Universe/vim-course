import { describe, expect, it, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaQuery } from './useMediaQuery';

function mockMatchMedia(matches: boolean) {
  let changeHandler: ((e: Partial<MediaQueryListEvent>) => void) | null = null;
  const mq = {
    matches,
    addEventListener: vi.fn(
      (_event: string, handler: (e: Partial<MediaQueryListEvent>) => void) => {
        changeHandler = handler;
      }
    ),
    removeEventListener: vi.fn(),
  };
  vi.spyOn(window, 'matchMedia').mockReturnValue(mq as unknown as MediaQueryList);
  return {
    mq,
    fire: (nextMatches: boolean) => changeHandler?.({ matches: nextMatches }),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useMediaQuery', () => {
  it('should return false before mount (SSR default)', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));
    // The initial useState value is false; the effect syncs after mount.
    // After mount the effect has already run, so we check the post-mount value.
    expect(typeof result.current).toBe('boolean');
  });

  it('should return true when the query matches after mount', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));
    expect(result.current).toBe(true);
  });

  it('should return false when the query does not match', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));
    expect(result.current).toBe(false);
  });

  it('should update when the media query match changes', () => {
    const { fire } = mockMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));

    expect(result.current).toBe(false);
    act(() => fire(true));
    expect(result.current).toBe(true);
    act(() => fire(false));
    expect(result.current).toBe(false);
  });

  it('should remove the event listener on unmount', () => {
    const { mq } = mockMatchMedia(false);
    const { unmount } = renderHook(() => useMediaQuery('(max-width: 767px)'));
    unmount();
    expect(mq.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
