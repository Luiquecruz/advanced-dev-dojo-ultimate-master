import type { Connect, Plugin } from 'vite';

/**
 * Policy of the Python worker. A dedicated worker uses the CSP delivered with its own script, so it is set on that response only:
 * scripts and wasm from the app's origin, no `eval` or `new Function`, network to the app's origin only (Pyodide's runtime files).
 */
export const PYTHON_WORKER_CSP = "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'";

const WORKER_PATH = /(?:^|\/)python\.worker(?:-[\w-]+)?\.(?:ts|js)(?:\?|$)/;

/**
 * Whether a request path is the Python worker script, in dev (`/src/engines/python/python.worker.ts?worker_file…`) or in a build (`/assets/python.worker-<hash>.js`).
 */
export function isPythonWorkerRequest(url: string): boolean {
  return WORKER_PATH.test(url.split('#')[0]);
}

function addHeader(): Connect.NextHandleFunction {
  return (request, response, next) => {
    if (isPythonWorkerRequest(request.url ?? '')) {
      response.setHeader('Content-Security-Policy', PYTHON_WORKER_CSP);
    }
    next();
  };
}

/**
 * Sends `PYTHON_WORKER_CSP` with the Python worker script from the Vite dev and preview servers. Production hosts must send the same header for `assets/python.worker-*.js`.
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
