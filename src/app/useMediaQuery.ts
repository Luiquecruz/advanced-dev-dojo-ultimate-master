import { useSyncExternalStore } from 'react';

/**
 * Subscribes to a CSS media query.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => {
      const list = matchMedia(query);
      list.addEventListener('change', callback);
      return () => list.removeEventListener('change', callback);
    },
    () => matchMedia(query).matches,
  );
}
