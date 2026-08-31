import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ANIMATIONS_PREFERENCE_EVENT,
  REDUCED_MOTION_ATTRIBUTE,
} from '@/hooks/useAnimationsPreference';
import { createFrameLoop } from './frameLoop';
import type { SceneEntry } from './scenes';

// A minimal scene whose frames are distinguishable by index.
const SCENE: SceneEntry = {
  fn: (frame, rows, cols) =>
    Array.from({ length: rows }, (_, row) => `frame${frame}-row${row}`.padEnd(cols)),
  period: 10,
  fps: 4,
};

const ROWS = 5;
const COLS = 20;

// jsdom does not implement requestAnimationFrame / cancelAnimationFrame with
// timestamps. Replace both with a Map keyed by id so cancellation is exact and
// flushRaf can advance time in a controlled way.
let rafMap: Map<number, (ts: number) => void> = new Map();
let rafCounter = 0;

function flushRaf(timestamp = 0): void {
  const entries = [...rafMap.entries()];
  rafMap = new Map();
  for (const [, cb] of entries) {
    cb(timestamp);
  }
}

beforeEach(() => {
  rafMap = new Map();
  rafCounter = 0;

  vi.stubGlobal('requestAnimationFrame', (cb: (ts: number) => void): number => {
    const id = ++rafCounter;
    rafMap.set(id, cb);
    return id;
  });

  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    rafMap.delete(id);
  });

  // Default: animations enabled (no attribute, no reduced-motion media query).
  document.documentElement.removeAttribute(REDUCED_MOTION_ATTRIBUTE);
  vi.stubGlobal(
    'matchMedia',
    (query: string): MediaQueryList =>
      ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }) as unknown as MediaQueryList
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute(REDUCED_MOTION_ATTRIBUTE);
});

describe('initial frame', () => {
  it('should emit frame 0 synchronously on creation', () => {
    const onFrame = vi.fn();
    createFrameLoop({ scene: SCENE, rows: ROWS, cols: COLS, onFrame }).destroy();

    expect(onFrame).toHaveBeenCalledOnce();
    expect(onFrame.mock.calls[0][0][0]).toContain('frame0');
  });

  it('should emit frame 0 even when animations are disabled via the user toggle', () => {
    document.documentElement.setAttribute(REDUCED_MOTION_ATTRIBUTE, '');
    const onFrame = vi.fn();
    createFrameLoop({ scene: SCENE, rows: ROWS, cols: COLS, onFrame }).destroy();

    expect(onFrame).toHaveBeenCalledOnce();
    expect(onFrame.mock.calls[0][0][0]).toContain('frame0');
  });

  it('should emit frame 0 even when prefers-reduced-motion is set', () => {
    vi.stubGlobal(
      'matchMedia',
      (query: string): MediaQueryList =>
        ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }) as unknown as MediaQueryList
    );
    const onFrame = vi.fn();
    createFrameLoop({ scene: SCENE, rows: ROWS, cols: COLS, onFrame }).destroy();

    expect(onFrame).toHaveBeenCalledOnce();
  });
});

describe('loop behavior when animations are enabled', () => {
  it('should schedule a rAF tick on creation', () => {
    const onFrame = vi.fn();
    const loop = createFrameLoop({ scene: SCENE, rows: ROWS, cols: COLS, onFrame });

    expect(rafMap.size).toBe(1);
    loop.destroy();
  });

  it('should advance the frame index after enough time has elapsed', () => {
    const onFrame = vi.fn();
    const loop = createFrameLoop({ scene: SCENE, rows: ROWS, cols: COLS, onFrame });
    // interval = 1000/4 = 250 ms
    flushRaf(0); // tick at t=0, sets lastTime, no frame advance
    flushRaf(300); // tick at t=300, elapsed=300 >= 250, advances one frame

    // frame0 (init) + tick@300 (advance to frame1) = 2 calls
    expect(onFrame).toHaveBeenCalledTimes(2);
    const lastCall = onFrame.mock.calls[onFrame.mock.calls.length - 1];
    expect(lastCall[0][0]).toContain('frame1');

    loop.destroy();
  });

  it('should not emit a new frame when elapsed time is below the interval', () => {
    const onFrame = vi.fn();
    const loop = createFrameLoop({ scene: SCENE, rows: ROWS, cols: COLS, onFrame });
    flushRaf(0); // sets lastTime
    flushRaf(100); // 100 ms < 250 ms interval — no advance

    // Only the initial frame 0; no interval crossed.
    expect(onFrame).toHaveBeenCalledTimes(1);
    loop.destroy();
  });
});

describe('loop behavior when animations are disabled', () => {
  it('should not schedule a rAF tick when the user toggle is off', () => {
    document.documentElement.setAttribute(REDUCED_MOTION_ATTRIBUTE, '');
    const onFrame = vi.fn();
    const loop = createFrameLoop({ scene: SCENE, rows: ROWS, cols: COLS, onFrame });

    expect(rafMap.size).toBe(0);
    loop.destroy();
  });

  it('should not schedule a rAF tick when prefers-reduced-motion is set', () => {
    vi.stubGlobal(
      'matchMedia',
      (query: string): MediaQueryList =>
        ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }) as unknown as MediaQueryList
    );
    const onFrame = vi.fn();
    const loop = createFrameLoop({ scene: SCENE, rows: ROWS, cols: COLS, onFrame });

    expect(rafMap.size).toBe(0);
    loop.destroy();
  });
});

describe('dynamic preference change', () => {
  it('should stop the loop and re-emit frame 0 when animations are disabled mid-session', () => {
    const onFrame = vi.fn();
    const loop = createFrameLoop({ scene: SCENE, rows: ROWS, cols: COLS, onFrame });
    flushRaf(0);
    flushRaf(300); // advance one frame — onFrame call #2

    // User disables animations.
    document.documentElement.setAttribute(REDUCED_MOTION_ATTRIBUTE, '');
    window.dispatchEvent(new Event(ANIMATIONS_PREFERENCE_EVENT)); // stopLoop emits frame0 — call #3

    const callCountAfterDisable = onFrame.mock.calls.length;
    const lastLine = onFrame.mock.calls[callCountAfterDisable - 1][0][0];
    expect(lastLine).toContain('frame0'); // re-emits static frame 0

    // The rAF was properly cancelled; no further frames emit.
    expect(rafMap.size).toBe(0);
    flushRaf(600);
    expect(onFrame).toHaveBeenCalledTimes(callCountAfterDisable);

    loop.destroy();
  });

  it('should restart the loop when animations are re-enabled mid-session', () => {
    document.documentElement.setAttribute(REDUCED_MOTION_ATTRIBUTE, '');
    const onFrame = vi.fn();
    const loop = createFrameLoop({ scene: SCENE, rows: ROWS, cols: COLS, onFrame });

    expect(rafMap.size).toBe(0);

    // User re-enables animations.
    document.documentElement.removeAttribute(REDUCED_MOTION_ATTRIBUTE);
    window.dispatchEvent(new Event(ANIMATIONS_PREFERENCE_EVENT));

    expect(rafMap.size).toBe(1); // loop started
    loop.destroy();
  });
});

describe('visibility pause', () => {
  it('should not resume the loop after becoming visible when animations are disabled', () => {
    const onFrame = vi.fn();
    const loop = createFrameLoop({ scene: SCENE, rows: ROWS, cols: COLS, onFrame });

    // Simulate tab hidden then shown.
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    // Disable animations while hidden.
    document.documentElement.setAttribute(REDUCED_MOTION_ATTRIBUTE, '');

    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(rafMap.size).toBe(0); // should not have scheduled a new tick
    loop.destroy();
  });
});

describe('destroy', () => {
  it('should cancel any pending rAF on destroy', () => {
    const cancelSpy = vi.spyOn(globalThis, 'cancelAnimationFrame');
    const onFrame = vi.fn();
    const loop = createFrameLoop({ scene: SCENE, rows: ROWS, cols: COLS, onFrame });

    loop.destroy();

    expect(cancelSpy).toHaveBeenCalled();
  });

  it('should remove the preference change listener on destroy so it no longer fires', () => {
    const onFrame = vi.fn();
    const loop = createFrameLoop({ scene: SCENE, rows: ROWS, cols: COLS, onFrame });
    loop.destroy();

    const callCount = onFrame.mock.calls.length;

    // Toggling the preference after destroy should do nothing.
    document.documentElement.setAttribute(REDUCED_MOTION_ATTRIBUTE, '');
    window.dispatchEvent(new Event(ANIMATIONS_PREFERENCE_EVENT));

    expect(onFrame).toHaveBeenCalledTimes(callCount);
  });

  it('should accept a cols function and pass the measured value to onFrame', () => {
    const onFrame = vi.fn();
    const loop = createFrameLoop({
      scene: SCENE,
      rows: ROWS,
      cols: () => 30,
      onFrame,
    });

    expect(onFrame.mock.calls[0][1]).toBe(30);
    loop.destroy();
  });
});
