#!/usr/bin/env node
// Builds the app, serves the build with `vite preview` and fails unless the production layout is what the host must reproduce:
// assets/python.worker-*.js carries the worker CSP, the page does not, path routes such as /python/<lesson> fall back to
// index.html, and the Pyodide runtime plus the vendored wheels are served from the app's origin.
// Usage: npm run smoke:worker-csp
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, preview } from 'vite';
import { PYTHON_WORKER_CSP } from '../../plugins/pythonWorkerCspPlugin.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const outDir = mkdtempSync(join(tmpdir(), 'dojo-csp-smoke-'));
const failures = [];

function expect(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

try {
  await build({ root: ROOT, logLevel: 'error', build: { outDir, emptyOutDir: true } });
  const worker = readdirSync(join(outDir, 'assets')).find((file) => /^python\.worker-[\w-]+\.js$/.test(file));
  expect(worker, 'the build emitted no assets/python.worker-*.js');
  const server = await preview({ root: ROOT, logLevel: 'error', build: { outDir }, preview: { port: 0, strictPort: false, open: false } });
  const origin = server.resolvedUrls?.local[0]?.replace(/\/$/, '');
  try {
    const page = await fetch(`${origin}/`);
    expect(page.ok, `GET / returned ${page.status}`);
    expect(page.headers.get('content-security-policy') !== PYTHON_WORKER_CSP, 'the page must not carry the worker CSP (it would break Monaco)');
    if (worker) {
      const script = await fetch(`${origin}/assets/${worker}`);
      expect(script.ok, `GET /assets/${worker} returned ${script.status}`);
      expect(script.headers.get('content-security-policy') === PYTHON_WORKER_CSP, `assets/${worker} must send Content-Security-Policy: ${PYTHON_WORKER_CSP} (got ${script.headers.get('content-security-policy')})`);
    }
    for (const route of ['/python', '/python/python-map', '/ai-engineering/calling-a-model']) {
      const response = await fetch(`${origin}${route}`);
      const body = await response.text();
      expect(response.ok && /<div id="root"/.test(body), `${route} must fall back to index.html (got ${response.status})`);
    }
    for (const file of ['pyodide/pyodide.asm.wasm', 'pyodide/python_stdlib.zip', 'pyodide/pyodide-lock.json', 'pyodide/pydantic-2.12.5-py3-none-any.whl', 'pyodide/licenses/pyodide-LICENSE']) {
      const response = await fetch(`${origin}/${file}`, { method: 'HEAD' });
      expect(response.ok, `/${file} returned ${response.status}`);
    }
  } finally {
    await new Promise((done) => server.httpServer.close(done));
  }
} finally {
  rmSync(outDir, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error(`worker CSP smoke test failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('worker CSP smoke test passed: worker header, page without it, SPA fallback for path routes, Pyodide and vendored wheels served');
