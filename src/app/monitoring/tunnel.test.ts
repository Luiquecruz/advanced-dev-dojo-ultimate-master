import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SENTRY_TUNNEL_PATH, sentryEnvelopeUrl, sentryTunnelProxy } from '../../../plugins/sentryTunnel.ts';

const root = resolve(import.meta.dirname, '../../..');
const netlifyToml = readFileSync(resolve(root, 'netlify.toml'), 'utf8');
const ciDsn = /VITE_SENTRY_DSN: \$\{\{ vars\.VITE_SENTRY_DSN \|\| '([^']+)' \}\}/.exec(readFileSync(resolve(root, '.github/workflows/ci.yml'), 'utf8'))![1];
const redirects = [...netlifyToml.matchAll(/\[\[redirects\]\]\s+from = "([^"]+)"\s+to = "([^"]+)"/g)].map(([, from, to]) => ({ from, to }));

describe('Sentry tunnel', () => {
  it('derives the envelope endpoint from the DSN', () => {
    expect(sentryEnvelopeUrl('https://key@o1.ingest.us.sentry.io/42')).toBe('https://o1.ingest.us.sentry.io/api/42/envelope/');
  });

  it('proxies the Netlify tunnel path to the project of the DSN CI builds with', () => {
    expect(redirects.find((redirect) => redirect.from === SENTRY_TUNNEL_PATH)?.to).toBe(sentryEnvelopeUrl(ciDsn));
  });

  it('matches the tunnel before the SPA fallback', () => {
    const order = redirects.map((redirect) => redirect.from);
    expect(order.indexOf(SENTRY_TUNNEL_PATH)).toBeGreaterThanOrEqual(0);
    expect(order.indexOf(SENTRY_TUNNEL_PATH)).toBeLessThan(order.indexOf('/*'));
  });

  it('has no preview proxy without a DSN', () => {
    expect(sentryTunnelProxy(undefined)).toEqual({});
  });
});
