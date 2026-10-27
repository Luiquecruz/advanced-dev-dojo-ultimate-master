import { useSyncExternalStore } from 'react';

export type Route =
  | { page: 'home' }
  | { page: 'track'; trackId: string }
  | { page: 'lesson'; trackId: string; lessonId: string };

function parse(hash: string): Route {
  const [trackId, lessonId] = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (!trackId) {
    return { page: 'home' };
  }
  if (!lessonId) {
    return { page: 'track', trackId: trackId };
  }
  return { page: 'lesson', trackId: trackId, lessonId };
}

function subscribe(callback: () => void) {
  window.addEventListener('hashchange', callback);
  return () => window.removeEventListener('hashchange', callback);
}

/**
 * Current hash route.
 */
export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => location.hash);
  return parse(hash);
}

export function hrefTo(route: Route): string {
  if (route.page === 'home') return '#/';
  if (route.page === 'track') return `#/${route.trackId}`;
  return `#/${route.trackId}/${route.lessonId}`;
}

export function navigate(route: Route): void {
  location.hash = hrefTo(route);
}
