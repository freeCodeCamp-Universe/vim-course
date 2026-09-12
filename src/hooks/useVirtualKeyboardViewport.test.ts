import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initVirtualKeyboardViewport } from './useVirtualKeyboardViewport';

/**
 * `window.visualViewport` is not implemented in jsdom, so we stub it as a
 * minimal EventTarget with a `height` property.
 */
function stubVisualViewport(height: number) {
  const listeners = new Map<string, Set<EventListener>>();
  const vv = {
    height,
    addEventListener(type: string, fn: EventListener) {
      if (!listeners.has(type)) {
        listeners.set(type, new Set());
      }
      listeners.get(type)!.add(fn);
    },
    removeEventListener(type: string, fn: EventListener) {
      listeners.get(type)?.delete(fn);
    },
    _fire(type: string) {
      listeners.get(type)?.forEach(fn => fn(new Event(type)));
    },
    _listenerCount(type: string) {
      return listeners.get(type)?.size ?? 0;
    },
  };
  Object.defineProperty(window, 'visualViewport', {
    value: vv,
    writable: true,
    configurable: true,
  });
  return vv;
}

function stubTouchDevice() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn((query: string) => ({
      matches: query === '(hover: none)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    })),
  });
}

function stubDesktopDevice() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn((query: string) => ({
      matches: query !== '(hover: none)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    })),
  });
}

function getAppHeight(): string {
  return document.documentElement.style.getPropertyValue('--app-height');
}

describe('initVirtualKeyboardViewport', () => {
  let originalVV: VisualViewport | null;
  let originalInnerHeight: number;

  beforeEach(() => {
    originalVV = window.visualViewport;
    originalInnerHeight = window.innerHeight;
    document.documentElement.style.removeProperty('--app-height');
  });

  afterEach(() => {
    Object.defineProperty(window, 'visualViewport', {
      value: originalVV,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, 'innerHeight', {
      value: originalInnerHeight,
      writable: true,
      configurable: true,
    });
    document.documentElement.style.removeProperty('--app-height');
  });

  it('should not set --app-height on init', () => {
    stubTouchDevice();
    stubVisualViewport(800);
    Object.defineProperty(window, 'innerHeight', {
      value: 800,
      writable: true,
      configurable: true,
    });

    const cleanup = initVirtualKeyboardViewport();

    expect(getAppHeight()).toBe('');

    cleanup();
  });

  it('should stamp --app-height when visual viewport shrinks below threshold', async () => {
    stubTouchDevice();
    const vv = stubVisualViewport(800);
    Object.defineProperty(window, 'innerHeight', {
      value: 800,
      writable: true,
      configurable: true,
    });

    const cleanup = initVirtualKeyboardViewport();

    // Simulate keyboard opening: visual viewport shrinks, layout viewport stays.
    vv.height = 400;
    vv._fire('resize');
    await new Promise(resolve => requestAnimationFrame(resolve));

    expect(getAppHeight()).toBe('400px');

    cleanup();
  });

  it('should remove --app-height when keyboard closes', async () => {
    stubTouchDevice();
    const vv = stubVisualViewport(800);
    Object.defineProperty(window, 'innerHeight', {
      value: 800,
      writable: true,
      configurable: true,
    });

    const cleanup = initVirtualKeyboardViewport();

    // Open keyboard.
    vv.height = 400;
    vv._fire('resize');
    await new Promise(resolve => requestAnimationFrame(resolve));
    expect(getAppHeight()).toBe('400px');

    // Close keyboard.
    vv.height = 800;
    vv._fire('resize');
    await new Promise(resolve => requestAnimationFrame(resolve));
    expect(getAppHeight()).toBe('');

    cleanup();
  });

  it('should ignore small viewport changes below threshold', async () => {
    stubTouchDevice();
    const vv = stubVisualViewport(800);
    Object.defineProperty(window, 'innerHeight', {
      value: 800,
      writable: true,
      configurable: true,
    });

    const cleanup = initVirtualKeyboardViewport();

    // Simulate address bar appearing: small drop well under threshold.
    vv.height = 740;
    vv._fire('resize');
    await new Promise(resolve => requestAnimationFrame(resolve));

    expect(getAppHeight()).toBe('');

    cleanup();
  });

  it('should be a no-op on desktop devices', () => {
    stubDesktopDevice();
    stubVisualViewport(900);

    const cleanup = initVirtualKeyboardViewport();

    expect(getAppHeight()).toBe('');

    cleanup();
  });

  it('should remove the listener after cleanup', () => {
    stubTouchDevice();
    const vv = stubVisualViewport(600);

    const cleanup = initVirtualKeyboardViewport();
    expect(vv._listenerCount('resize')).toBe(1);

    cleanup();
    expect(vv._listenerCount('resize')).toBe(0);
  });
});
