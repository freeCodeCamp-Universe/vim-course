import {
  ANIMATIONS_PREFERENCE_EVENT,
  REDUCED_MOTION_ATTRIBUTE,
} from '@/hooks/useAnimationsPreference';
import type { SceneEntry } from './scenes';

/**
 * A cancelable animation loop that drives a scene at a fixed frame rate,
 * independent of the display's refresh rate. Respects both `prefers-reduced-motion`
 * and the user's animation preference toggle (via the `data-reduced-motion`
 * attribute set by `useAnimationsPreference`): renders frame 0 once and starts no
 * loop when either is set. Responds dynamically to preference changes. Pauses on
 * `document.hidden`.
 */
export interface FrameLoop {
  /** Stop the loop, cancel pending frames, and remove listeners. */
  destroy(): void;
}

export interface FrameLoopOptions {
  scene: SceneEntry;
  rows: number;
  cols: number | (() => number);
  /** Called with each computed frame's lines and the cols value used. */
  onFrame: (lines: string[], cols: number) => void;
}

/** Whether animations should be suppressed -- OS reduced-motion or the user's toggle. */
function isAnimationsDisabled(): boolean {
  const prefersReducedMotion =
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const userDisabled =
    typeof document !== 'undefined' &&
    document.documentElement.hasAttribute(REDUCED_MOTION_ATTRIBUTE);
  return prefersReducedMotion || userDisabled;
}

export function createFrameLoop(options: FrameLoopOptions): FrameLoop {
  const { scene, rows, onFrame } = options;
  const cols = options.cols;
  const measureCols: () => number = typeof cols === 'function' ? cols : () => cols;
  const interval = 1000 / scene.fps;

  let frameIndex = 0;
  let rafId: number | null = null;
  let lastTime: number | null = null;
  let paused = false;
  let destroyed = false;

  // Emit frame 0 immediately so the screen is never blank.
  const c0 = measureCols();
  onFrame(scene.fn(0, rows, c0), c0);

  function tick(timestamp: number): void {
    if (paused || destroyed) {
      rafId = null;
      return;
    }

    if (lastTime === null) {
      lastTime = timestamp;
    }

    const elapsed = timestamp - lastTime;
    if (elapsed >= interval) {
      // Advance by how many intervals elapsed (skip frames on long gaps).
      const steps = Math.floor(elapsed / interval);
      frameIndex = (frameIndex + steps) % scene.period;
      lastTime = timestamp - (elapsed % interval);
      const c = measureCols();
      onFrame(scene.fn(frameIndex, rows, c), c);
    }

    rafId = requestAnimationFrame(tick);
  }

  function startLoop(): void {
    if (rafId === null && !paused && !destroyed) {
      frameIndex = 0;
      lastTime = null;
      rafId = requestAnimationFrame(tick);
    }
  }

  function stopLoop(): void {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    const c = measureCols();
    onFrame(scene.fn(0, rows, c), c);
  }

  if (!isAnimationsDisabled()) {
    startLoop();
  }

  function onAnimationsPreferenceChange(): void {
    if (isAnimationsDisabled()) {
      stopLoop();
    } else {
      startLoop();
    }
  }

  function onVisibilityChange(): void {
    if (document.hidden) {
      paused = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    } else {
      paused = false;
      lastTime = null; // Reset accumulator so we don't jump frames.
      if (!isAnimationsDisabled() && !destroyed) {
        rafId = requestAnimationFrame(tick);
      }
    }
  }

  window.addEventListener(ANIMATIONS_PREFERENCE_EVENT, onAnimationsPreferenceChange);
  document.addEventListener('visibilitychange', onVisibilityChange);

  return {
    destroy() {
      destroyed = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      window.removeEventListener(ANIMATIONS_PREFERENCE_EVENT, onAnimationsPreferenceChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    },
  };
}
