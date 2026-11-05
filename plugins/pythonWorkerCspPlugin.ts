import type { Connect, Plugin } from 'vite';

/**
 * Policy of the engine workers that run learner code in WebAssembly (Python on Pyodide, C# on the .NET runtime). A dedicated worker
 * uses the CSP delivered with its own script, so it is set on that response only: scripts and wasm from the app's origin, no `eval`
 * or `new Function`, network to the app's origin only (the runtime files under `pyodide/` and `dotnet/`).
 */
export const WORKER_CSP = "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'";

/** The Python worker's policy; the same value as `WORKER_CSP`. */
export const PYTHON_WORKER_CSP = WORKER_CSP;

/** Worker scripts that get `WORKER_CSP`, by the file name prefix before `.worker` (`python.worker.ts`, `csharp.worker-<hash>.js`). */
export const CSP_WORKERS = ['python', 'csharp'] as const;

const WORKER_PATH = new RegExp(`(?:^|/)(?:${CSP_WORKERS.join('|')})\\.worker(?:-[\\w-]+)?\\.(?:ts|js)(?:\\?|$)`);

/**
 * Whether a request path is an engine worker script, in dev (`/src/engines/python/python.worker.ts?worker_file…`) or in a build (`/assets/csharp.worker-<hash>.js`).
 */
export function isEngineWorkerRequest(url: string): boolean {
  return WORKER_PATH.test(url.split('#')[0]);
}

function addHeader(): Connect.NextHandleFunction {
  return (request, response, next) => {
    if (isEngineWorkerRequest(request.url ?? '')) {
      response.setHeader('Content-Security-Policy', WORKER_CSP);
    }
    next();
  };
}

/**
 * Sends `WORKER_CSP` with the Python and C# worker scripts from the Vite dev and preview servers. Production hosts must send the same
 * header for `assets/python.worker-*` and `assets/csharp.worker-*` (`netlify.toml`).
 */
export function pythonWorkerCspPlugin(): Plugin {
  return {
    name: 'dojo-python-worker-csp',
    configureServer(server) {
      server.middlewares.use(addHeader());
    },
    configurePreviewServer(server) {
      server.middlewares.use(addHeader());
    },
  };
}
