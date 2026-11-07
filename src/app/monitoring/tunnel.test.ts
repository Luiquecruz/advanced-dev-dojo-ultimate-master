import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SENTRY_TUNNEL_PATH, sentryEnvelopeUrl, sentryTunnelProxy } from '../../../plugins/sentryTunnel.ts';

const root = resolve(import.meta.dirname, '../../..');
const ciDsn = process.env.VITE_SENTRY_DSN || /VITE_SENTRY_DSN: \$\{\{ vars\.VITE_SENTRY_DSN \|\| '([^']+)' \}\}/.exec(readFileSync(resolve(root, '.github/workflows/ci.yml'), 'utf8'))![1];

describe('Sentry tunnel', () => {
  it('derives the envelope endpoint from the DSN', () => {
    expect(sentryEnvelopeUrl('https://key@o1.ingest.us.sentry.io/42')).toBe('https://o1.ingest.us.sentry.io/api/42/envelope/');
  });

  it('proxies the preview tunnel path to the project of the DSN CI builds with', () => {
    const target = new URL(sentryEnvelopeUrl(ciDsn));
    const proxy = sentryTunnelProxy(ciDsn)[SENTRY_TUNNEL_PATH];
    expect(proxy.target).toBe(target.origin);
    expect(proxy.rewrite?.(SENTRY_TUNNEL_PATH)).toBe(target.pathname);
  });

  it('has no preview proxy without a DSN', () => {
    expect(sentryTunnelProxy(undefined)).toEqual({});
  });
});
