import { parseRoute } from '@/shared/routing/route';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

const WORKER_NAME = 'constela-mission';

/**
 * Sentry environment of the host serving the app: `development` on a local server, `preview` on a Cloudflare Workers Preview or
 * Deployment URL (`<preview>-constela-mission.<subdomain>.workers.dev`), `production` otherwise.
 */
export function environmentForHost(hostname: string): string {
  if (LOCAL_HOSTS.has(hostname)) {
    return 'development';
  }
  return hostname.split('.')[0].endsWith(`-${WORKER_NAME}`) ? 'preview' : 'production';
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
