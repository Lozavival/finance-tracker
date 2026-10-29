import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Global mock for fetch to prevent network calls in DOM tests
vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
  Promise.resolve(
    new Response(JSON.stringify({ result: 'success', rates: { BRL: 5.5 } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  ),
);

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

// Polyfill window.matchMedia for next-themes and responsive hooks
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Polyfill ResizeObserver for Radix UI and Recharts
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Polyfill IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  root = null;
  rootMargin = '';
  thresholds = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
};
