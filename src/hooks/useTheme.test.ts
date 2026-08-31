import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useTheme } from './useTheme';

const STORAGE_KEY = 'vim-course:theme';

// Mock matchMedia to simulate system theme preference
function mockMatchMedia(prefersDark: boolean) {
  window.matchMedia = vi.fn((query) => ({
    matches: query === '(prefers-color-scheme: light)' ? !prefersDark : prefersDark,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  // Default to dark system preference
  mockMatchMedia(true);
});

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  vi.clearAllMocks();
});

describe('useTheme', () => {
  it('should default to dark when system prefers dark and localStorage is empty', () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('dark');
    expect(result.current.isDark).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('should default to light when system prefers light and localStorage is empty', () => {
    mockMatchMedia(false); // System prefers light
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('light');
    expect(result.current.isDark).toBe(false);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('should toggle between dark and light', () => {
    const { result } = renderHook(() => useTheme());

    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe('light');
    expect(result.current.isDark).toBe(false);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe('dark');
    expect(result.current.isDark).toBe(true);
  });

  it('should persist the chosen theme to localStorage', () => {
    const { result } = renderHook(() => useTheme());

    act(() => result.current.toggleTheme());

    expect(localStorage.getItem(STORAGE_KEY)).toBe('light');
  });

  it('should read the persisted theme on mount', () => {
    localStorage.setItem(STORAGE_KEY, 'light');

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('light');
  });

  it('should fall back to system preference when the stored value is malformed', () => {
    localStorage.setItem(STORAGE_KEY, 'chartreuse');
    mockMatchMedia(false); // System prefers light

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('light');
  });

  it('should prefer localStorage over system preference', () => {
    localStorage.setItem(STORAGE_KEY, 'light');
    mockMatchMedia(true); // System prefers dark

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('light');
  });
});
