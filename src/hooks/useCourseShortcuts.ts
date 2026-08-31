import { useEffect } from 'react';

export interface UseCourseShortcutsOptions {
  /** The lesson currently open; the anchor for next/previous movement. */
  currentLessonId: string;
  /** Reachable lesson ids in course order (completed + the current frontier). */
  reachableLessonIds: string[];
  /** Navigate to a lesson (Alt+N / Alt+P). */
  onNavigate: (lessonId: string) => void;
  /** Move focus into the terminal, revealing it first on the tabbed layout (Alt+2). */
  onFocusTerminal: () => void;
  /** Move focus into the instructions panel (Alt+1). */
  onFocusInstructions: () => void;
  /** Open the lesson nav drawer (Alt+M), delegating to the drawer owner. */
  onOpenDrawer: () => void;
  /** Open the keyboard shortcuts modal (Alt+/), delegating to the overlay owner. */
  onOpenShortcuts: () => void;
  /** Speak a brief note (e.g. a boundary no-op) via a polite live region. */
  announce: (message: string) => void;
  /** Pause the shortcuts, e.g. while the drawer traps focus. Defaults to true. */
  enabled?: boolean;
}

/**
 * Global course-navigation shortcuts, fired from a window listener so they work
 * regardless of terminal focus. Every binding is a modifier combo the terminal
 * deliberately ignores (the terminal view passes Alt/Meta/Ctrl combos through), so
 * none collide with typed Vim commands: `Alt+N`/`Alt+P` step within the reachable
 * range (a boundary is a no-op with a live-region note, never a jump into locked
 * lessons), `Alt+1` focuses the instructions panel, `Alt+2` focuses the terminal,
 * and `Alt+M` opens the nav drawer. Unshifted `Cmd+ArrowLeft`/`Cmd+ArrowRight`
 * are prevented so the browser cannot use them to navigate through the lesson history.
 * `Alt+/` opens the keyboard shortcuts modal. `Cmd/Ctrl+Enter` (the primary action)
 * is owned by `PrimaryAction`'s own global listener and is intentionally not duplicated
 * here. Uses `event.code` so macOS Option dead-keys do not mask the letter.
 */
export function useCourseShortcuts({
  currentLessonId,
  reachableLessonIds,
  onNavigate,
  onFocusTerminal,
  onFocusInstructions,
  onOpenDrawer,
  onOpenShortcuts,
  announce,
  enabled = true,
}: UseCourseShortcutsOptions): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    function step(delta: -1 | 1) {
      const index = reachableLessonIds.indexOf(currentLessonId);
      const target = index === -1 ? undefined : reachableLessonIds[index + delta];
      if (target) {
        onNavigate(target);
      } else {
        announce(delta === 1 ? 'no next lesson' : 'no previous lesson');
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (
        event.metaKey &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.shiftKey &&
        (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
      ) {
        event.preventDefault();
        return;
      }

      if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
        if (event.code === 'KeyN') {
          event.preventDefault();
          step(1);
        } else if (event.code === 'KeyP') {
          event.preventDefault();
          step(-1);
        } else if (event.code === 'Digit1') {
          event.preventDefault();
          onFocusInstructions();
        } else if (event.code === 'Digit2') {
          event.preventDefault();
          onFocusTerminal();
        } else if (event.code === 'KeyM') {
          event.preventDefault();
          onOpenDrawer();
        } else if (event.code === 'Slash') {
          event.preventDefault();
          onOpenShortcuts();
        }
        return;
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    enabled,
    currentLessonId,
    reachableLessonIds,
    onNavigate,
    onFocusTerminal,
    onFocusInstructions,
    onOpenDrawer,
    onOpenShortcuts,
    announce,
  ]);
}
