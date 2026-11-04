import { loadPyodide } from 'pyodide';
import { createPythonEngine, PYTHON_ENV, type PythonEngine } from './engine';
import { lockDownPython, pythonJsGlobals, refuseStringTimers } from './lockdown';
import type { PythonWorkerRequest, PythonWorkerResponse } from './protocol';
import { snapshotImports } from './snapshot';

const PYODIDE_URL = new URL(`${import.meta.env.BASE_URL}pyodide/`, self.location.origin).href;
const scope = self as unknown as Record<string, unknown>;
const postToClient = self.postMessage.bind(self);

let engine: PythonEngine | undefined;

function post(message: PythonWorkerResponse, transfer: Transferable[] = []) {
  postToClient(message, { transfer });
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Boots Pyodide with the standard library modules the harness uses already imported, and returns its memory snapshot.
 */
async function makeSnapshot(): Promise<Uint8Array> {
  const pyodide = await loadPyodide({ indexURL: PYODIDE_URL, env: { ...PYTHON_ENV }, _makeSnapshot: true });
  pyodide.runPython(snapshotImports());
  return pyodide.makeMemorySnapshot();
}

/**
 * Loads Pyodide (from a snapshot when one is given) and the vendored packages the lesson imports (by name, integrity-checked against the lock file, from the app's origin),
 * installs the harness, then removes network access and code generation before any lesson code runs.
 */
async function boot(snapshot: Uint8Array | undefined, packages: string[]): Promise<PythonEngine> {
  refuseStringTimers(scope);
  const pyodide = await loadPyodide({ indexURL: PYODIDE_URL, env: { ...PYTHON_ENV }, jsglobals: pythonJsGlobals(scope), ...(snapshot ? { _loadSnapshot: snapshot } : {}) });
  if (packages.length > 0) {
    await pyodide.loadPackage(packages, { checkIntegrity: true, messageCallback: () => undefined });
  }
  const python = createPythonEngine(pyodide);
  lockDownPython(scope, pyodide);
  return python;
}

self.onmessage = async (event: MessageEvent<PythonWorkerRequest>) => {
  const message = event.data;
  try {
    if (message.type === 'make-snapshot') {
      const bytes = await makeSnapshot();
      post({ type: 'snapshot', bytes }, [bytes.buffer]);
    }
    if (message.type === 'boot') {
      engine = await boot(message.snapshot, message.packages ?? []);
      post({ type: 'ready' });
    }
    if (message.type === 'run-tests' && engine) {
      const { id } = message;
      const report = await engine.runTests({ ...message, onEvent: (testEvent) => post({ type: 'test-event', id, event: testEvent }) });
      post({ type: 'test-report', id, report });
    }
    if (message.type === 'run' && engine) {
      await engine.runProgram(message.files, message.entry, (level, text) => post({ type: 'console', id: message.id, level, text }));
      post({ type: 'run-complete', id: message.id });
    }
  } catch (error) {
    post({ type: 'failed', message: `${message.type === 'boot' ? 'Python could not start' : 'Python stopped unexpectedly'}: ${describe(error)}` });
  }
};
