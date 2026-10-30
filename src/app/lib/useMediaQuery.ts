import { useSyncExternalStore } from 'react';

function subscribe(query: string) {
  return (callback: () => void) => {
    if (typeof window === 'undefined') {
      return () => {};
    }
    const mql = window.matchMedia(query);
    mql.addEventListener('change', callback);
    return () => {
      mql.removeEventListener('change', callback);
    };
  };
}

function getSnapshot(query: string) {
  return () => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia(query).matches;
  };
}

function getServerSnapshot() {
  return false;
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(subscribe(query), getSnapshot(query), getServerSnapshot);
}

export interface Breakpoints {
  isPhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

export function useBreakpoint(): Breakpoints {
  const isPhone = useMediaQuery('(max-width: 639px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isTablet = !isPhone && !isDesktop;

  return { isPhone, isTablet, isDesktop };
}
