import { SENTRY_TUNNEL_PATH, sentryEnvelopeUrl } from '../plugins/sentryTunnel.ts';

/** Bindings the Worker reads, declared in `wrangler.jsonc`. */
export interface WorkerEnv {
  SENTRY_DSN: string;
}

/**
 * Forwards a Sentry envelope posted to the tunnel to the envelope endpoint of the project in `SENTRY_DSN`.
 */
export async function forwardEnvelope(request: Request, dsn: string): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  }
  const upstream = await fetch(sentryEnvelopeUrl(dsn), {
    method: 'POST',
    headers: { 'Content-Type': request.headers.get('Content-Type') ?? 'application/x-sentry-envelope' },
    body: request.body,
  });
  return new Response(upstream.body, { status: upstream.status, headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json' } });
}

/**
 * Cloudflare Worker in front of the static assets of `dist/`. Only `run_worker_first` paths reach it (the Sentry tunnel); every other
 * request is served from the assets with the SPA fallback.
 */
export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    if (new URL(request.url).pathname === SENTRY_TUNNEL_PATH) {
      return forwardEnvelope(request, env.SENTRY_DSN);
    }
    return new Response(null, { status: 404 });
  },
};
