import type { PyodideAPI } from 'pyodide';

/**
 * The only JavaScript globals Python's `import js` sees: plain ECMAScript values and timers that refuse strings.
 */
export const PYTHON_JS_GLOBALS = [
  'Object', 'Array', 'Promise', 'Error', 'TypeError', 'RangeError', 'SyntaxError', 'JSON', 'Math', 'Number', 'String', 'Boolean', 'Symbol',
  'BigInt', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Date', 'RegExp', 'ArrayBuffer', 'DataView', 'Uint8Array', 'Int32Array', 'Float64Array',
  'setTimeout', 'clearTimeout', 'queueMicrotask', 'TextEncoder', 'TextDecoder',
] as const;

/**
 * Globals that reach the network or load code from a URL. They are removed once Pyodide has loaded its runtime.
 */
export const NETWORK_GLOBALS = [
  'fetch', 'XMLHttpRequest', 'WebSocket', 'WebSocketStream', 'WebTransport', 'EventSource', 'importScripts', 'Worker', 'SharedWorker',
  'FontFace', 'fonts', 'caches', 'BroadcastChannel', 'eval',
] as const;

const STRING_TIMERS = ['setTimeout', 'setInterval'] as const;
const CODE_GENERATION_DISABLED = 'Code generation is disabled in the Python sandbox.';
const PACKAGES_DISABLED = 'Installing packages is disabled in Dev Dojo: lessons use the standard library only.';

type Scope = Record<string, unknown>;

function removeGlobal(scope: Scope, name: string): void {
  for (let owner: object | null = scope; owner && owner !== Object.prototype; owner = Object.getPrototypeOf(owner)) {
    if (Object.hasOwn(owner, name)) {
      Reflect.deleteProperty(owner, name);
    }
  }
  if (name in scope) {
    Object.defineProperty(scope, name, { value: undefined, configurable: false, writable: false });
  }
}

function refuseCodeGeneration(): never {
  throw new EvalError(CODE_GENERATION_DISABLED);
}

/**
 * Makes `setTimeout`/`setInterval` refuse string handlers (they are `eval` in disguise). Safe before Pyodide loads.
 */
export function refuseStringTimers(scope: Scope): void {
  for (const name of STRING_TIMERS) {
    const original = scope[name];
    if (typeof original !== 'function') {
      continue;
    }
    const guarded = function (this: unknown, handler: unknown, ...rest: unknown[]) {
      if (typeof handler !== 'function') {
        throw new TypeError(`${name} only accepts a function in the Python sandbox.`);
      }
      return Reflect.apply(original, scope, [handler, ...rest]);
    };
    Object.defineProperty(scope, name, { value: guarded, configurable: true, writable: true });
  }
}

/**
 * The object to pass as `jsglobals` to `loadPyodide`, built from the allow-list.
 */
export function pythonJsGlobals(scope: Scope): Record<string, unknown> {
  return Object.fromEntries(PYTHON_JS_GLOBALS.filter((name) => name in scope).map((name) => [name, scope[name]]));
}

/**
 * Runs once Pyodide is loaded and before any lesson code: removes network globals and `eval`, makes every function
 * constructor (`fn.constructor`, async, generator) throw, and makes package installation refuse.
 */
export function lockDownPython(scope: Scope, pyodide: PyodideAPI): void {
  for (const name of NETWORK_GLOBALS) {
    removeGlobal(scope, name);
  }
  const samples = [function () {}, async function () {}, function* () {}, async function* () {}];
  for (const sample of samples) {
    Object.defineProperty(Object.getPrototypeOf(sample), 'constructor', { value: refuseCodeGeneration, configurable: false, writable: false });
  }
  const api = pyodide as unknown as Scope;
  for (const name of ['loadPackage', 'loadPackagesFromImports']) {
    Object.defineProperty(api, name, { value: () => Promise.reject(new Error(PACKAGES_DISABLED)), configurable: false, writable: false });
  }
}
