import { useCallback, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

/**
 * The localStorage key holding the persisted theme. Exported so the layout's
 * pre-paint inline script can be guarded against key drift; the script itself
 * must inline the literal, since inline scripts cannot import.
 */
export const THEME_STORAGE_KEY = 'vim-course:theme';

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') {
      return stored;
    }
  } catch {
    // Fall through to system preference when storage is unavailable.
  }
  // Check system theme preference when no stored value exists.
  if (window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark';
}

export interface UseThemeResult {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

/**
 * Theme state that respects user preferences and persistence. Reads the persisted choice
 * synchronously on mount, reflects the active theme onto `documentElement` as `data-theme`,
 * and persists every change. When no stored preference exists, respects the system theme
 * preference via `prefers-color-scheme`, falling back to dark if unavailable. First paint
 * is stamped by the layout's pre-paint inline script, so this effect re-asserts the same
 * value with no flash.
 */
export function useTheme(): UseThemeResult {
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Persistence is best-effort: a full or unavailable store must not break the app.
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, isDark: theme === 'dark', toggleTheme };
}
