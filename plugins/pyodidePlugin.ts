import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import type { Plugin } from 'vite';

const RUNTIME_FILES: Record<string, string> = {
  'pyodide.asm.mjs': 'text/javascript',
  'pyodide.asm.wasm': 'application/wasm',
  'python_stdlib.zip': 'application/zip',
  'pyodide-lock.json': 'application/json',
};

/**
 * Serves the Pyodide runtime files from `node_modules/pyodide` at `<base>pyodide/` in dev and copies them there in the build,
 * so the Python worker loads a pinned runtime from the app's own origin.
 */
export function pyodidePlugin(): Plugin {
  const packageDirectory = dirname(createRequire(import.meta.url).resolve('pyodide/package.json'));
  let base = '/';

  return {
    name: 'dojo-pyodide',
    config: () => ({ optimizeDeps: { exclude: ['pyodide'] } }),
    configResolved(config) {
      base = config.base;
    },
    configureServer(server) {
      server.middlewares.use(`${base}pyodide`, (request, response, next) => {
        const fileName = (request.url ?? '').split('?')[0].replace(/^\//, '');
        const contentType = RUNTIME_FILES[fileName];
        if (!contentType) {
          next();
          return;
        }
        response.setHeader('Content-Type', contentType);
        response.end(readFileSync(join(packageDirectory, fileName)));
      });
    },
    generateBundle() {
      for (const fileName of Object.keys(RUNTIME_FILES)) {
        this.emitFile({ type: 'asset', fileName: `pyodide/${fileName}`, source: readFileSync(join(packageDirectory, fileName)) });
      }
    },
  };
}
