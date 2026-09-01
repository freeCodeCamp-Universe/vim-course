const STORAGE_KEY = 'vim-course:progress';
const STORAGE_VERSION = 2;

export interface CompletedEntry {
  id: string;
  /** Unix timestamp (ms) when the lesson was marked complete. */
  completedAt: number;
}

interface StoredProgress {
  version: 2;
  completed: CompletedEntry[];
}

export function readProgress(): CompletedEntry[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null) {
      return [];
    }

    const stored = parsed as { version?: unknown; completed?: unknown };

    // Migrate v1: completed was a plain string[]. Assign index-based timestamps
    // so relative order is preserved even though wall-clock times are unavailable.
    if (stored.version === 1 && Array.isArray(stored.completed)) {
      const ids = (stored.completed as unknown[]).filter(
        (id): id is string => typeof id === 'string'
      );
      return ids.map((id, index) => ({ id, completedAt: index }));
    }

    if (stored.version !== STORAGE_VERSION || !Array.isArray(stored.completed)) {
      return [];
    }

    return (stored.completed as unknown[]).filter(
      (entry): entry is CompletedEntry =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as CompletedEntry).id === 'string' &&
        typeof (entry as CompletedEntry).completedAt === 'number'
    );
  } catch {
    return [];
  }
}

export function writeProgress(completed: CompletedEntry[]): void {
  try {
    const payload: StoredProgress = { version: STORAGE_VERSION, completed };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Persistence is best-effort: a full or unavailable store must not break the app.
  }
}
