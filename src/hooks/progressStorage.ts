const STORAGE_KEY = 'vim-course:progress';
const STORAGE_VERSION = 1;

interface StoredProgress {
  version: number;
  completed: string[];
}

export function readProgress(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      (parsed as StoredProgress).version !== STORAGE_VERSION ||
      !Array.isArray((parsed as StoredProgress).completed)
    ) {
      return [];
    }

    return (parsed as StoredProgress).completed.filter(
      (id): id is string => typeof id === 'string'
    );
  } catch {
    return [];
  }
}

export function writeProgress(completed: string[]): void {
  try {
    const payload: StoredProgress = { version: STORAGE_VERSION, completed };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Persistence is best-effort: a full or unavailable store must not break the app.
  }
}
