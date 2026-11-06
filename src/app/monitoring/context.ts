import { parseRoute } from '@/shared/routing/route';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Sentry environment of the host serving the app: `development` on a local server, `preview` on a Netlify Deploy Preview or branch
 * deploy (`deploy-preview-12--site.netlify.app`, `branch--site.netlify.app`), `production` otherwise.
 */
export function environmentForHost(hostname: string): string {
  if (LOCAL_HOSTS.has(hostname)) {
    return 'development';
  }
  return hostname.includes('--') ? 'preview' : 'production';
}

/**
 * Low-cardinality transaction name of a pathname: the route pattern, never the track or lesson id.
 */
export function routeTransactionName(pathname: string, basename: string): string {
  const path = pathname.startsWith(basename) ? `/${pathname.slice(basename.length).replace(/^\//, '')}` : pathname;
  const route = parseRoute(path);
  if (route.page === 'lesson') {
    return '/:trackId/:lessonId';
  }
  return route.page === 'track' ? '/:trackId' : '/';
}
