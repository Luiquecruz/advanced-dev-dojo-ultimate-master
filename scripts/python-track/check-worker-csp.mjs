#!/usr/bin/env node
// Fails unless a served build has the production layout the host must reproduce: assets/python.worker-*.js carries the
// worker CSP, the page does not, path routes such as /python/<lesson> fall back to index.html, and the Pyodide runtime
// plus the vendored wheels are served from the app's origin.
// Usage: npm run smoke:worker-csp                                  builds the app and checks it under `vite preview`
//        npm run smoke:worker-csp -- --url <origin> --dist <dir>   checks a deployed build (CI runs it on each Netlify deploy)
import { createHash } from 'node:crypto';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { build, preview } from 'vite';
import { PYTHON_WORKER_CSP } from '../../plugins/pythonWorkerCspPlugin.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const { values: options } = parseArgs({ options: { url: { type: 'string' }, dist: { type: 'string' } } });
if (Boolean(options.url) !== Boolean(options.dist)) {
  console.error('--url and --dist go together: the deployed origin and the build directory that was deployed');
  process.exit(2);
}
const failures = [];

function expect(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function workerFile(outDir) {
  const worker = readdirSync(join(outDir, 'assets')).find((file) => /^python\.worker-[\w-]+\.js$/.test(file));
  expect(worker, 'the build emitted no assets/python.worker-*.js');
  return worker;
}

async function checkServed(origin, outDir, worker) {
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
  // Every file the build put under pyodide/ (runtime, loader, lock, wheels, licenses), compared byte for byte: the host's
  // SPA fallback answers a missing file with index.html and status 200.
  const pyodideFiles = readdirSync(join(outDir, 'pyodide'), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(outDir, join(entry.parentPath, entry.name)).split(sep).join('/'));
  for (const required of ['pyodide/pyodide.asm.mjs', 'pyodide/pyodide.asm.wasm', 'pyodide/python_stdlib.zip', 'pyodide/pyodide-lock.json', 'pyodide/pydantic-2.12.5-py3-none-any.whl', 'pyodide/licenses/pyodide-LICENSE']) {
    expect(pyodideFiles.includes(required), `the build has no ${required}`);
  }
  for (const file of pyodideFiles) {
    const response = await fetch(`${origin}/${file}`);
    const served = Buffer.from(await response.arrayBuffer());
    expect(response.ok, `/${file} returned ${response.status}`);
    expect(sha256(served) === sha256(readFileSync(join(outDir, file))), `/${file} does not match the build (got ${response.headers.get('content-type')}, ${served.length} bytes)`);
  }
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

if (options.url) {
  const dist = resolve(options.dist);
  await checkServed(options.url.replace(/\/$/, ''), dist, workerFile(dist));
} else {
  const outDir = mkdtempSync(join(tmpdir(), 'dojo-csp-smoke-'));
  try {
    await build({ root: ROOT, logLevel: 'error', build: { outDir, emptyOutDir: true } });
    const worker = workerFile(outDir);
    const server = await preview({ root: ROOT, logLevel: 'error', build: { outDir }, preview: { port: 0, strictPort: false, open: false } });
    try {
      await checkServed(server.resolvedUrls?.local[0]?.replace(/\/$/, ''), outDir, worker);
    } finally {
      await new Promise((done) => server.httpServer.close(done));
    }
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
}

if (failures.length > 0) {
  console.error(`worker CSP smoke test failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('worker CSP smoke test passed: worker header, page without it, SPA fallback for path routes, Pyodide and vendored wheels served');
