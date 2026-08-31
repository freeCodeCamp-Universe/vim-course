import '@testing-library/jest-dom';

// jsdom does not implement matchMedia. Simulate a desktop viewport: min-width
// queries match, max-width queries do not. This reflects the most common test
// context and keeps components that branch on viewport in their desktop state.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string): MediaQueryList =>
    ({
      matches: /min-width/.test(query),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList,
});

// jsdom does not implement IntersectionObserver. Provide a no-op stub so
// components that set one up in useEffect don't throw in the test environment.
global.IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
  // Satisfy the interface — tests that need callback behavior should mock
  // IntersectionObserver more specifically in their own describe block.
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds: ReadonlyArray<number> = [];
} as unknown as typeof IntersectionObserver;
