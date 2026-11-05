import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import type { Plugin } from 'vite';

const RUNTIME_FILES: Record<string, string> = {
  'pyodide.asm.mjs': 'text/javascript',
  'pyodide.asm.wasm': 'application/wasm',
  'python_stdlib.zip': 'application/zip',
  'pyodide-lock.json': 'application/json',
};

const VENDOR_DIRECTORY = resolve(import.meta.dirname, '..', 'vendor', 'pyodide-packages');

/**
 * Vendored package wheels (`npm run python:vendor`) by published file name, plus their license files under `licenses/`.
 * Wheels sit next to `pyodide-lock.json`, so `loadPackage("pydantic")` resolves them by name and checks their sha256 against the lock.
 */
function vendoredFiles(): Record<string, { path: string; contentType: string }> {
  const manifestPath = join(VENDOR_DIRECTORY, 'manifest.json');
  if (!existsSync(manifestPath)) {
    return {};
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { packages: { file: string }[] };
  const files: Record<string, { path: string; contentType: string }> = {};
  for (const { file } of manifest.packages) {
    const path = join(VENDOR_DIRECTORY, file);
    if (!existsSync(path)) {
      throw new Error(`Missing Pyodide package ${file}: run \`npm install\` or \`npm run python:vendor\` (it downloads the packages pinned in vendor/pyodide-packages/manifest.json).`);
    }
    files[file] = { path, contentType: 'application/zip' };
  }
  const licenses = join(VENDOR_DIRECTORY, 'licenses');
  for (const file of existsSync(licenses) ? readdirSync(licenses) : []) {
    files[`licenses/${file}`] = { path: join(licenses, file), contentType: 'text/plain; charset=utf-8' };
  }
  return files;
}

/**
 * Short hash of every file served under `pyodide/`, by published name and content. index.html carries it in
 * `<meta name="dojo-pyodide">`, because no hashed entry asset names these files: without it, a deploy that changes only
 * `pyodide/` (a wheel update) would look like the previous build to the deploy smoke test.
 */
function pyodideFilesHash(files: Record<string, string>): string {
  const hash = createHash('sha256');
  for (const fileName of Object.keys(files).sort()) {
    hash.update(fileName).update('\0').update(readFileSync(files[fileName])).update('\0');
  }
  return hash.digest('hex').slice(0, 16);
}

/**
 * Serves the Pyodide runtime files from `node_modules/pyodide` at `<base>pyodide/` in dev and copies them there in the build,
 * so the Python worker loads a pinned runtime from the app's own origin. The vendored package wheels and their licenses are served and copied the same way.
 */
export function pyodidePlugin(): Plugin {
  const packageDirectory = dirname(createRequire(import.meta.url).resolve('pyodide/package.json'));
  const vendored = vendoredFiles();
  let base = '/';
  let filesHash: string | undefined;

  return {
    name: 'dojo-pyodide',
    config: () => ({ optimizeDeps: { exclude: ['pyodide'] } }),
    configResolved(config) {
      base = config.base;
    },
    transformIndexHtml() {
      filesHash ??= pyodideFilesHash({
        ...Object.fromEntries(Object.keys(RUNTIME_FILES).map((fileName) => [fileName, join(packageDirectory, fileName)])),
        ...Object.fromEntries(Object.entries(vendored).map(([fileName, file]) => [fileName, file.path])),
      });
      return [{ tag: 'meta', attrs: { name: 'dojo-pyodide', content: filesHash }, injectTo: 'head' }];
    },
    configureServer(server) {
      server.middlewares.use(`${base}pyodide`, (request, response, next) => {
        const fileName = (request.url ?? '').split('?')[0].replace(/^\//, '');
        const runtimeType = RUNTIME_FILES[fileName];
        const file = runtimeType ? { path: join(packageDirectory, fileName), contentType: runtimeType } : vendored[fileName];
        if (!file) {
          next();
          return;
        }
        response.setHeader('Content-Type', file.contentType);
        response.end(readFileSync(file.path));
      });
    },
    generateBundle() {
      for (const fileName of Object.keys(RUNTIME_FILES)) {
        this.emitFile({ type: 'asset', fileName: `pyodide/${fileName}`, source: readFileSync(join(packageDirectory, fileName)) });
      }
      for (const [fileName, file] of Object.entries(vendored)) {
        this.emitFile({ type: 'asset', fileName: `pyodide/${fileName}`, source: readFileSync(file.path) });
      }
    },
  };
}
