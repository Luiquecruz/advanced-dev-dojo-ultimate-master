import { constants as fsConstants } from 'node:fs';
import { registerHooks } from 'node:module';
import { constants as osConstants } from 'node:os';
import { loadPyodide, type PyodideAPI } from 'pyodide';
import { createPythonEngine, PYTHON_ENV, type PythonEngine } from '../engines/python/engine';
import { lockDownPython, pythonJsGlobals, refuseStringTimers } from '../engines/python/lockdown';
import { snapshotImports } from '../engines/python/snapshot';
import { processAllowList } from './pythonSandboxProcess';
import type { SandboxRequest, SandboxResponse } from './pythonSandbox';

const HOST_FILE_SYSTEMS = ['NODEFS', 'NODERAWFS'];

const host = process;
const send = host.send!.bind(host);

function post(message: SandboxResponse): void {
  send(message);
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Pyodide's NODEFS reads `process.binding("constants")`, which the permission model denies; serve the same constants without the binding.
 */
function shimConstantsBinding(): void {
  const constants = { fs: fsConstants, os: osConstants };
  Object.defineProperty(host, 'binding', {
    configurable: true,
    value: (name: string) => {
      if (name === 'constants') {
        return constants;
      }
      throw new Error(`process.binding("${name}") is not allowed.`);
    },
  });
}

/**
 * Hides what lesson code could use to reach the host once Pyodide is loaded: `process` becomes an allow-list, module loading, NODEFS, network globals and code generation go. The permission model is the outer boundary.
 */
function lockDown(pyodide: PyodideAPI): void {
  registerHooks({
    resolve(specifier) {
      throw new Error(`Importing "${specifier}" is not allowed while lesson code runs.`);
    },
  });
  Object.defineProperty(globalThis, 'process', { value: processAllowList(host), configurable: false, writable: false, enumerable: false });
  lockDownPython(globalThis as unknown as Record<string, unknown>, pyodide);
  const api = pyodide as unknown as Record<string, unknown> & { FS: { filesystems: Record<string, unknown> }; _module: Record<string, unknown> };
  for (const name of HOST_FILE_SYSTEMS) {
    Reflect.deleteProperty(api.FS.filesystems, name);
    Reflect.deleteProperty(api._module, name);
  }
  Reflect.deleteProperty(api, 'mountNodeFS');
}

/**
 * Boots Pyodide with the standard library modules the harness uses already imported, and returns its memory snapshot.
 */
async function makeSnapshot(): Promise<Uint8Array> {
  shimConstantsBinding();
  const pyodide = await loadPyodide({ indexURL: host.argv[2], env: { ...PYTHON_ENV }, _makeSnapshot: true, stdout: () => undefined, stderr: () => undefined });
  pyodide.runPython(snapshotImports());
  return pyodide.makeMemorySnapshot();
}

async function start(snapshot: Uint8Array | undefined, packages: string[]): Promise<PythonEngine> {
  shimConstantsBinding();
  refuseStringTimers(globalThis as unknown as Record<string, unknown>);
  const globals = pythonJsGlobals(globalThis as unknown as Record<string, unknown>);
  const pyodide = await loadPyodide({
    indexURL: host.argv[2],
    packageBaseUrl: host.argv[3],
    env: { ...PYTHON_ENV },
    jsglobals: globals,
    stdout: () => undefined,
    stderr: () => undefined,
    ...(snapshot ? { _loadSnapshot: snapshot } : {}),
  });
  if (packages.length > 0) {
    await pyodide.loadPackage(packages, { checkIntegrity: true, messageCallback: () => undefined });
  }
  const engine = createPythonEngine(pyodide);
  pyodide.runPython('import os\nos.urandom(1)');
  lockDown(pyodide);
  return engine;
}

host.on('disconnect', () => host.exit(0));

let engine: PythonEngine;

host.on('message', async (request: SandboxRequest) => {
  try {
    if (request.type === 'make-snapshot') {
      post({ type: 'snapshot', bytes: await makeSnapshot() });
    }
    if (request.type === 'boot') {
      try {
        engine = await start(request.snapshot, request.packages ?? []);
        post({ type: 'ready' });
      } catch (error) {
        post({ type: 'failed', message: `Python could not start: ${describe(error)}` });
      }
    }
    if (request.type === 'run-tests') {
      const report = await engine.runTests({ ...request, onEvent: (event) => post({ type: 'test-event', event }) });
      post({ type: 'test-report', report });
    }
    if (request.type === 'run') {
      const code = await engine.runProgram(request.files, request.entry, (level, text) => post({ type: 'console', level, text }));
      post({ type: 'run-complete', code });
    }
  } catch (error) {
    post({ type: 'failed', message: `Python stopped unexpectedly: ${describe(error)}` });
  }
});
