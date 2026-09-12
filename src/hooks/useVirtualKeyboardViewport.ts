/**
 * Keeps a CSS custom property (`--app-height`) on `<html>` in sync with the
 * visual viewport height while the mobile virtual keyboard is open.
 *
 * `interactive-widget=resizes-content` in the viewport meta tag handles this
 * for Chrome Android 93+, but iOS Safari ignores that directive. This listener
 * bridges the gap on iOS: it compares `visualViewport.height` with
 * `window.innerHeight` — when the keyboard is open on iOS the visual viewport
 * shrinks but `innerHeight` stays at the full layout-viewport height — and
 * stamps `--app-height` only while a keyboard-sized gap exists.
 *
 * On Chrome Android with `resizes-content`, `innerHeight` and
 * `visualViewport.height` move together so the threshold is never reached and
 * the property stays unset. CSS falls back to `100dvh`, which the browser
 * already resizes. The hook is therefore safe on both platforms.
 *
 * The hook is a no-op on desktop (pointer devices with hover) and when the
 * Visual Viewport API is unavailable.
 */

const PROPERTY = '--app-height';

/**
 * Minimum pixel gap between the layout viewport and the visual viewport
 * before we treat it as a virtual keyboard. Address-bar show/hide on iOS
 * is typically under 80 px; most keyboards are 200 px+.
 */
const KEYBOARD_THRESHOLD = 100;

let listenerCount = 0;

function isTouchDevice(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(hover: none)').matches
  );
}

function update(): void {
  if (!window.visualViewport) {
    return;
  }

  const visualHeight = window.visualViewport.height;
  const layoutHeight = window.innerHeight;

  if (layoutHeight - visualHeight > KEYBOARD_THRESHOLD) {
    document.documentElement.style.setProperty(
      PROPERTY,
      `${visualHeight}px`
    );
  } else {
    document.documentElement.style.removeProperty(PROPERTY);
  }
}

function onResize(): void {
  // Use requestAnimationFrame to coalesce rapid resize events that fire
  // while the keyboard is animating open or closed.
  requestAnimationFrame(update);
}

/**
 * Call once from the app root. Attaches the `visualViewport` resize listener
 * on touch devices and returns a cleanup function.
 */
export function initVirtualKeyboardViewport(): () => void {
  if (!isTouchDevice() || !window.visualViewport) {
    return () => {};
  }

  if (listenerCount === 0) {
    window.visualViewport.addEventListener('resize', onResize);
  }
  listenerCount += 1;

  return () => {
    listenerCount -= 1;
    if (listenerCount === 0) {
      window.visualViewport!.removeEventListener('resize', onResize);
      document.documentElement.style.removeProperty(PROPERTY);
    }
  };
}
