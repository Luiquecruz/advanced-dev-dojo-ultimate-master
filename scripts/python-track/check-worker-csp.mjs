#!/usr/bin/env node
// Fails unless a served build has the production layout the host must reproduce: assets/python.worker-*.js (and
// assets/csharp.worker-*.js once the C# engine has a worker) carry the worker CSP, the page does not, path routes such as
// /python/<lesson> fall back to index.html, and the Pyodide runtime with the vendored wheels and the .NET runtime with the
// C# engine's assemblies (dotnet/<version>/, as listed in vendor/dotnet/manifest.json: Webcil and wrapped reference assemblies as
// .wasm, no .dll) are served from the app's origin. Against a deploy it also checks that dotnet/ is cached as immutable and that the
// .js and .wasm files are compressed by the host, since the Brotli budget in scripts/csharp-track/vendor-dotnet.mjs assumes it.
// Usage: npm run smoke:worker-csp                                  builds the app and checks it under `vite preview`
//        npm run smoke:worker-csp -- --url <origin> --dist <dir>   checks a deployed build (CI runs it on each Netlify deploy)
//        add --build-only to only check that <origin> serves this build's index.html (exit 3 while another build is live)
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { build, preview } from 'vite';
import { WORKER_CSP } from '../../plugins/pythonWorkerCspPlugin.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const { values: options } = parseArgs({ options: { url: { type: 'string' }, dist: { type: 'string' }, 'build-only': { type: 'boolean' } } });
if (Boolean(options.url) !== Boolean(options.dist)) {
  console.error('--url and --dist go together: the deployed origin and the build directory that was deployed');
  process.exit(2);
}
if (options['build-only'] && !options.url) {
  console.error('--build-only needs --url and --dist');
  process.exit(2);
}
const failures = [];

function expect(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

// Engine workers that must carry WORKER_CSP. The C# worker is required once its source exists (the engine ships it).
const WORKERS = [
  { name: 'python', required: true },
  { name: 'csharp', required: existsSync(join(ROOT, 'src/engines/csharp/csharp.worker.ts')) },
];

/**
 * The engine worker scripts the build emitted, as assets/ file names.
 */
function workerFiles(outDir) {
  const assets = readdirSync(join(outDir, 'assets'));
  const workers = [];
  for (const { name, required } of WORKERS) {
    const worker = assets.find((file) => new RegExp(`^${name}\\.worker-[\\w-]+\\.js$`).test(file));
    expect(worker || !required, `the build emitted no assets/${name}.worker-*.js`);
    if (worker) workers.push(worker);
  }
  return workers;
}

/**
 * Every file the build put under a directory, as published paths.
 */
function builtFiles(outDir, directory) {
  if (!existsSync(join(outDir, directory))) return [];
  return readdirSync(join(outDir, directory), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(outDir, join(entry.parentPath, entry.name)).split(sep).join('/'));
}

/**
 * Fetches every built file under `directory` and compares it byte for byte: the host's SPA fallback answers a missing file
 * with index.html and status 200, so a status check alone would pass.
 */
async function checkFiles(origin, outDir, directory, required) {
  const files = builtFiles(outDir, directory);
  for (const file of required) {
    expect(files.includes(file), `the build has no ${file}`);
  }
  for (const file of files) {
    const response = await fetch(`${origin}/${file}`);
    const served = Buffer.from(await response.arrayBuffer());
    expect(response.ok, `/${file} returned ${response.status}`);
    const built = readFileSync(join(outDir, file));
    expect(sha256(served) === sha256(built), `/${file} does not match the build (got ${response.headers.get('content-type')}, ${served.length} bytes)`);
    if (file.endsWith('.wasm')) {
      expect(response.headers.get('content-type')?.startsWith('application/wasm'), `/${file} must be served as application/wasm (got ${response.headers.get('content-type')})`);
    }
  }
}

/**
 * The built dotnet/<version>/ files against the manifest that was built with them: every listed file present with its pinned
 * sha256, and no .dll anywhere. Returns the version folder and the published paths.
 */
function checkDotnetManifest(outDir) {
  const versions = existsSync(join(outDir, 'dotnet')) ? readdirSync(join(outDir, 'dotnet')) : [];
  expect(versions.length === 1, `the build must have exactly one dotnet/<version>/ folder (got ${versions.join(', ') || 'none'})`);
  const prefix = `dotnet/${versions[0]}`;
  const manifestPath = join(outDir, prefix, 'manifest.json');
  if (!existsSync(manifestPath)) return { prefix, files: [] };
  const { files, version } = JSON.parse(readFileSync(manifestPath, 'utf8'));
  expect(version === versions[0], `${prefix}/manifest.json has version ${version}`);
  const published = [];
  for (const file of files) {
    const path = join(outDir, prefix, file.path);
    const bytes = existsSync(path) ? readFileSync(path) : undefined;
    expect(bytes !== undefined && sha256(bytes) === file.sha256, `${prefix}/${file.path} is missing from the build or does not match dotnet/manifest.json`);
    published.push(`${prefix}/${file.path}`);
  }
  for (const file of builtFiles(outDir, 'dotnet')) {
    expect(!/\.(dll|gz)$/.test(file), `${file}: dotnet/ serves Webcil .wasm assemblies only, no .dll or .gz file`);
  }
  return { prefix, files: published };
}

/**
 * Deploy-only checks of how the host serves dotnet/: immutable caching, and compressed .js and .wasm files (the runtime, a Webcil
 * assembly and a wrapped reference assembly).
 */
async function checkDotnetServing(origin, prefix) {
  for (const file of ['dotnet.native.wasm', 'dotnet.runtime.js', 'System.Private.CoreLib.wasm', 'assemblies/Microsoft.CodeAnalysis.CSharp.wasm', 'ref/System.Runtime.wasm']) {
    const response = await fetch(`${origin}/${prefix}/${file}`, { headers: { 'Accept-Encoding': 'br, gzip' } });
    expect(/br|gzip/.test(response.headers.get('content-encoding') ?? ''), `/${prefix}/${file} is served uncompressed (content-encoding: ${response.headers.get('content-encoding')})`);
    expect((response.headers.get('cache-control') ?? '').includes('immutable'), `/${prefix}/${file} must be cached as immutable (got ${response.headers.get('cache-control')})`);
    await response.arrayBuffer();
  }
}

/**
 * The build's index.html, its hashed entry assets and a predicate telling whether a served page is this build's page.
 * Same build, not just a healthy one: an older deploy still live would pass every other check. The served HTML must
 * contain every line of this build's index.html in order (the host may inject its own lines, such as a comment, but a
 * changed or removed line fails, a new meta description included) plus the root element the app mounts on.
 */
function buildPage(outDir) {
  const html = readFileSync(join(outDir, 'index.html'), 'utf8');
  const lines = html.split('\n').map((line) => line.trim()).filter(Boolean);
  const entryAssets = [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+)"/g)].map((match) => match[1]);
  const isThisBuild = (served) => {
    let cursor = 0;
    for (const line of lines) {
      const found = served.indexOf(line, cursor);
      if (found === -1) return false;
      cursor = found + line.length;
    }
    return served.includes('<div id="root"');
  };
  return { html, entryAssets, isThisBuild };
}

/**
 * Whether the origin's page is this build's page; false while another build is live or the origin is unreachable.
 */
async function servesBuild(origin, outDir) {
  const { isThisBuild } = buildPage(outDir);
  try {
    const page = await fetch(`${origin}/`, { cache: 'no-store' });
    return page.ok && isThisBuild(await page.text());
  } catch {
    return false;
  }
}

async function checkServed(origin, outDir, workers, deployed) {
  const { html: buildHtml, entryAssets, isThisBuild } = buildPage(outDir);
  expect(entryAssets.length > 0, 'the build index.html references no /assets/ files');
  expect(buildHtml.includes('<div id="root"'), 'the build index.html has no <div id="root"> (src/main.tsx mounts the app there)');
  const page = await fetch(`${origin}/`);
  expect(page.ok, `GET / returned ${page.status}`);
  expect(isThisBuild(await page.text()), "GET / does not serve this build's index.html (an older deploy is still live, or the root element is missing)");
  for (const asset of entryAssets) {
    const response = await fetch(`${origin}/${asset}`);
    expect(response.ok && sha256(Buffer.from(await response.arrayBuffer())) === sha256(readFileSync(join(outDir, asset))), `/${asset} does not match the build`);
  }
  expect(page.headers.get('content-security-policy') !== WORKER_CSP, 'the page must not carry the worker CSP (it would break Monaco)');
  for (const worker of workers) {
    const script = await fetch(`${origin}/assets/${worker}`);
    const served = Buffer.from(await script.arrayBuffer());
    expect(script.ok, `GET /assets/${worker} returned ${script.status}`);
    expect(sha256(served) === sha256(readFileSync(join(outDir, 'assets', worker))), `/assets/${worker} does not match the build`);
    expect(script.headers.get('content-security-policy') === WORKER_CSP, `assets/${worker} must send Content-Security-Policy: ${WORKER_CSP} (got ${script.headers.get('content-security-policy')})`);
  }
  for (const route of ['/python', '/python/python-map', '/ai-engineering/calling-a-model']) {
    const response = await fetch(`${origin}${route}`);
    expect(response.ok && isThisBuild(await response.text()), `${route} must fall back to this build's index.html (got ${response.status})`);
  }
  await checkFiles(origin, outDir, 'pyodide', ['pyodide/pyodide.asm.mjs', 'pyodide/pyodide.asm.wasm', 'pyodide/python_stdlib.zip', 'pyodide/pyodide-lock.json', 'pyodide/pydantic-2.12.5-py3-none-any.whl', 'pyodide/licenses/pyodide-LICENSE']);
  const dotnet = checkDotnetManifest(outDir);
  const required = ['manifest.json', 'dotnet.js', 'dotnet.runtime.js', 'dotnet.native.js', 'dotnet.native.wasm', 'System.Private.CoreLib.wasm', 'assemblies/DojoHost.wasm', 'assemblies/Dojo.Testing.wasm', 'ref/System.Runtime.wasm', 'licenses/dotnet-LICENSE.TXT'];
  await checkFiles(origin, outDir, 'dotnet', [...required.map((file) => `${dotnet.prefix}/${file}`), ...dotnet.files]);
  if (deployed) {
    await checkDotnetServing(origin, dotnet.prefix);
  }
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

if (options['build-only']) {
  const origin = options.url.replace(/\/$/, '');
  if (await servesBuild(origin, resolve(options.dist))) {
    console.log(`${origin} serves this build`);
    process.exit(0);
  }
  console.log(`${origin} serves another build`);
  process.exit(3);
} else if (options.url) {
  const dist = resolve(options.dist);
  await checkServed(options.url.replace(/\/$/, ''), dist, workerFiles(dist), true);
} else {
  const outDir = mkdtempSync(join(tmpdir(), 'dojo-csp-smoke-'));
  try {
    await build({ root: ROOT, logLevel: 'error', build: { outDir, emptyOutDir: true } });
    const workers = workerFiles(outDir);
    const server = await preview({ root: ROOT, logLevel: 'error', build: { outDir }, preview: { port: 0, strictPort: false, open: false } });
    try {
      await checkServed(server.resolvedUrls?.local[0]?.replace(/\/$/, ''), outDir, workers, false);
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
console.log(`worker CSP smoke test passed: worker header on ${WORKERS.filter(({ required }) => required).map(({ name }) => name).join(' and ')} workers, page without it, SPA fallback for path routes, Pyodide, vendored wheels and dotnet/<version>/ files served`);
