import { matchPath, useLocation } from 'react-router';

export type Route =
  | { page: 'home' }
  | { page: 'track'; trackId: string }
  | { page: 'lesson'; trackId: string; lessonId: string };

const LESSON_PATH = '/:trackId/:lessonId/*';
const TRACK_PATH = '/:trackId';

/**
 * Route named by a pathname relative to the router basename.
 */
export function parseRoute(pathname: string): Route {
  const lesson = matchPath(LESSON_PATH, pathname);
  if (lesson) {
    return { page: 'lesson', trackId: lesson.params.trackId!, lessonId: lesson.params.lessonId! };
  }
  const track = matchPath(TRACK_PATH, pathname);
  if (track) {
    return { page: 'track', trackId: track.params.trackId! };
  }
  return { page: 'home' };
}

/**
 * Current route from the router location.
 */
export function useRoute(): Route {
  return parseRoute(useLocation().pathname);
}

/**
 * Router path of a route, used as the `to` of a `Link`.
 */
export function hrefTo(route: Route): string {
  if (route.page === 'home') return '/';
  if (route.page === 'track') return `/${route.trackId}`;
  return `/${route.trackId}/${route.lessonId}`;
}

/**
 * Path form of a legacy `#/<track>/<lesson>` URL, or `null` when the URL has no hash route.
 */
export function legacyHashRedirect(url: Pick<Location, 'hash' | 'search'>, basename: string): string | null {
  if (!url.hash.startsWith('#/')) {
    return null;
  }
  return `${basename.replace(/\/$/, '')}${url.hash.slice(1)}${url.search}`;
}
