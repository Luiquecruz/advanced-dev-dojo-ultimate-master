import type { PyodideAPI } from 'pyodide';
import { blockCodeGeneration, refuseStringTimers as refuseStringTimersIn, removeNetworkGlobals, type WorkerScope } from '../shared/workerLockdown';

export { NETWORK_GLOBALS } from '../shared/workerLockdown';

/**
 * The only JavaScript globals Python's `import js` sees: plain ECMAScript values and timers that refuse strings.
 */
export const PYTHON_JS_GLOBALS = [
  'Object', 'Array', 'Promise', 'Error', 'TypeError', 'RangeError', 'SyntaxError', 'JSON', 'Math', 'Number', 'String', 'Boolean', 'Symbol',
  'BigInt', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Date', 'RegExp', 'ArrayBuffer', 'DataView', 'Uint8Array', 'Int32Array', 'Float64Array',
  'setTimeout', 'clearTimeout', 'queueMicrotask', 'TextEncoder', 'TextDecoder',
] as const;

/**
 * Pyodide file systems that reach storage outside the in-memory FS (host files, IndexedDB, the File System Access API).
 */
const STORAGE_FILE_SYSTEMS = ['NODEFS', 'NODERAWFS', 'IDBFS', 'NATIVEFS_ASYNC', 'NATIVEFS'] as const;
const STORAGE_MOUNTS = ['mountNodeFS', 'mountNativeFS'] as const;

const CODE_GENERATION_DISABLED = 'Code generation is disabled in the Python sandbox.';
const PACKAGES_DISABLED = 'Installing packages is disabled in Dev Dojo: lessons use the standard library only.';

type Scope = WorkerScope;

/**
 * Makes `setTimeout`/`setInterval` refuse string handlers (they are `eval` in disguise). Safe before Pyodide loads.
 */
export function refuseStringTimers(scope: Scope): void {
  refuseStringTimersIn(scope, 'Python');
}

/**
 * The object to pass as `jsglobals` to `loadPyodide`, built from the allow-list.
 */
export function pythonJsGlobals(scope: Scope): Record<string, unknown> {
  return Object.fromEntries(PYTHON_JS_GLOBALS.filter((name) => name in scope).map((name) => [name, scope[name]]));
}

/**
 * Runs once Pyodide is loaded and before any lesson code: removes network and storage globals, replaces `Function`, `eval`
 * and every function constructor (`fn.constructor`, async, generator) with throwing stand-ins, drops Pyodide's own
 * reference to `Function` (`_api.tests`), the storage file systems and mounts, and makes package installation refuse.
 */
export function lockDownPython(scope: Scope, pyodide: PyodideAPI): void {
  removeNetworkGlobals(scope);
  blockCodeGeneration(scope, CODE_GENERATION_DISABLED);
  const api = pyodide as unknown as Scope & { _api: Scope; _module: Scope; FS: { filesystems: Scope } };
  Reflect.deleteProperty(api._api, 'tests');
  for (const name of STORAGE_FILE_SYSTEMS) {
    Reflect.deleteProperty(api.FS.filesystems, name);
    Reflect.deleteProperty(api._module, name);
  }
  for (const name of STORAGE_MOUNTS) {
    Reflect.deleteProperty(api, name);
  }
  for (const name of ['loadPackage', 'loadPackagesFromImports']) {
    Object.defineProperty(api, name, { value: () => Promise.reject(new Error(PACKAGES_DISABLED)), configurable: false, writable: false });
  }
}
