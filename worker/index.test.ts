// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CSP_WORKERS, WORKER_CSP } from '../plugins/pythonWorkerCspPlugin.ts';
import { sentryEnvelopeUrl } from '../plugins/sentryTunnel.ts';
import worker from './index.ts';

const root = resolve(import.meta.dirname, '..');
const wranglerConfig = JSON.parse(readFileSync(resolve(root, 'wrangler.jsonc'), 'utf8'));
const headers = readFileSync(resolve(root, 'public/_headers'), 'utf8');
const ciDsn = /VITE_SENTRY_DSN: \$\{\{ vars\.VITE_SENTRY_DSN \|\| '([^']+)' \}\}/.exec(readFileSync(resolve(root, '.github/workflows/ci.yml'), 'utf8'))![1];
const env = { SENTRY_DSN: ciDsn };

function rulesFor(pattern: string): string[] {
  const block = headers.trim().split(/\n\s*\n/).find((rule) => rule.split('\n')[0] === pattern);
  return block ? block.split('\n').slice(1).map((line) => line.trim()) : [];
}

describe('Cloudflare Worker', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('serves dist with the SPA fallback and runs only for the Sentry tunnel', () => {
    expect(wranglerConfig.assets).toEqual({ directory: './dist', not_found_handling: 'single-page-application', run_worker_first: ['/signal'] });
  });

  it('tunnels production and Previews to the project of the DSN CI builds with', () => {
    expect(wranglerConfig.vars.SENTRY_DSN).toBe(ciDsn);
    expect(wranglerConfig.previews.vars.SENTRY_DSN).toBe(ciDsn);
  });

  it('sends the worker CSP with every engine worker script', () => {
    for (const name of CSP_WORKERS) {
      expect(rulesFor(`/assets/${name}.worker-*`)).toEqual([`Content-Security-Policy: ${WORKER_CSP}`]);
    }
  });

  it('caches hashed assets and the .NET files as immutable', () => {
    for (const pattern of ['/assets/*', '/dotnet/*']) {
      expect(rulesFor(pattern)).toEqual(['Cache-Control: public, max-age=31536000, immutable']);
    }
  });

  it('forwards an envelope to the envelope endpoint', async () => {
    const upstream = vi.fn(async () => new Response('{"id":"1"}', { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', upstream);
    const response = await worker.fetch(new Request('https://constela.example/signal', { method: 'POST', body: 'envelope', headers: { 'Content-Type': 'text/plain' } }), env);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('{"id":"1"}');
    expect(upstream).toHaveBeenCalledOnce();
    const [url, init] = upstream.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(sentryEnvelopeUrl(ciDsn));
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'text/plain' });
  });

  it('rejects other methods on the tunnel', async () => {
    const upstream = vi.fn();
    vi.stubGlobal('fetch', upstream);
    const response = await worker.fetch(new Request('https://constela.example/signal'), env);
    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('POST');
    expect(upstream).not.toHaveBeenCalled();
  });
});
