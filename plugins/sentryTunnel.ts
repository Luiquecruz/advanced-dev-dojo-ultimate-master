import type { ProxyOptions } from 'vite';

/** Same-origin path the SDK sends envelopes to (`tunnel`), so ad blockers that block the Sentry ingest host do not drop them. */
export const SENTRY_TUNNEL_PATH = '/signal';

/**
 * Envelope endpoint of the Sentry project a DSN points to (`https://<host>/api/<project>/envelope/`), the target of the tunnel.
 */
export function sentryEnvelopeUrl(dsn: string): string {
  const url = new URL(dsn);
  return `${url.origin}/api${url.pathname}/envelope/`;
}

/**
 * Proxy of the Vite preview server that forwards the tunnel to the project's envelope endpoint, as the `netlify.toml` rewrite does
 * in production; none without a DSN.
 */
export function sentryTunnelProxy(dsn: string | undefined): Record<string, ProxyOptions> {
  if (!dsn) {
    return {};
  }
  const target = new URL(sentryEnvelopeUrl(dsn));
  return { [SENTRY_TUNNEL_PATH]: { target: target.origin, changeOrigin: true, rewrite: () => target.pathname } };
}
