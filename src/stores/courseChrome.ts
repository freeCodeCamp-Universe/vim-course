import { useSyncExternalStore } from 'react';

/**
 * App-global chrome that lives above the routes: the lesson nav drawer, the
 * keyboard-shortcuts modal, and settings modal. Under Astro the header, the overlays, and the lesson
 * workspace are three separate islands, so React Context (which only spans one
 * island) can no longer carry this shared state. This is a tiny module-level
 * store all of them import instead: the header buttons and a lesson's `Alt+K`
 * write to it, and the overlay island reads it to open and close.
 */
interface ChromeState {
  /** Whether the lesson nav drawer is currently open. */
  drawerOpen: boolean;
  /** Whether the keyboard-shortcuts modal is currently open. */
  shortcutsOpen: boolean;
  /** Whether the settings modal is currently open. */
  settingsOpen: boolean;
}

let state: ChromeState = { drawerOpen: false, shortcutsOpen: false, settingsOpen: false };
const listeners = new Set<() => void>();

function set(next: Partial<ChromeState>): void {
  state = { ...state, ...next };
  for (const listener of listeners) {
    listener();
  }
}

// The element that had focus when an overlay opened. Captured synchronously in
// the caller's island so the correct element is available even when the overlay
// renders in a separate Astro island (separate React root) where
// document.activeElement may have shifted by the time the modal's layout effect
// runs.
let triggerElement: HTMLElement | null = null;

function openOverlay(key: keyof ChromeState): void {
  triggerElement = document.activeElement as HTMLElement | null;
  set({ [key]: true });
}

function closeOverlay(key: keyof ChromeState): void {
  set({ [key]: false });
  triggerElement = null;
}

export const courseChrome = {
  openDrawer: () => openOverlay('drawerOpen'),
  closeDrawer: () => closeOverlay('drawerOpen'),
  openShortcuts: () => openOverlay('shortcutsOpen'),
  closeShortcuts: () => closeOverlay('shortcutsOpen'),
  openSettings: () => openOverlay('settingsOpen'),
  closeSettings: () => closeOverlay('settingsOpen'),
  getTriggerElement: (): HTMLElement | null => triggerElement,
  getState: (): ChromeState => state,
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  /** Test-only: restore the initial closed state between cases. */
  reset: () => {
    set({ drawerOpen: false, shortcutsOpen: false, settingsOpen: false });
    triggerElement = null;
  },
};

export interface CourseChrome extends ChromeState {
  openDrawer: () => void;
  closeDrawer: () => void;
  openShortcuts: () => void;
  closeShortcuts: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  triggerElement: HTMLElement | null;
}

/** Subscribe an island to the shared chrome state and its open/close actions. */
export function useCourseChrome(): CourseChrome {
  const snapshot = useSyncExternalStore(
    courseChrome.subscribe,
    courseChrome.getState,
    courseChrome.getState
  );
  return {
    drawerOpen: snapshot.drawerOpen,
    shortcutsOpen: snapshot.shortcutsOpen,
    openDrawer: courseChrome.openDrawer,
    closeDrawer: courseChrome.closeDrawer,
    openShortcuts: courseChrome.openShortcuts,
    closeShortcuts: courseChrome.closeShortcuts,
    settingsOpen: snapshot.settingsOpen,
    openSettings: courseChrome.openSettings,
    closeSettings: courseChrome.closeSettings,
    triggerElement: courseChrome.getTriggerElement(),
  };
}
