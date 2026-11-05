/**
 * Building blocks of the lock-down applied inside the engine workers that run learner code in WebAssembly (Python, C#): what
 * reaches the network or loads code is removed from the worker scope, and string code generation throws.
 */

export type WorkerScope = Record<string, unknown>;

/**
 * Globals that reach the network or load code from a URL. The engines remove them once their runtime has loaded.
 */
export const NETWORK_GLOBALS = [
  'fetch', 'XMLHttpRequest', 'WebSocket', 'WebSocketStream', 'WebTransport', 'EventSource', 'importScripts', 'Worker', 'SharedWorker',
  'FontFace', 'fonts', 'caches', 'BroadcastChannel', 'indexedDB',
] as const;

const STRING_TIMERS = ['setTimeout', 'setInterval'] as const;

/**
 * Deletes a global from the scope and its prototype chain, then pins it to `undefined` if a getter still answers for it.
 */
export function removeGlobal(scope: WorkerScope, name: string): void {
  for (let owner: object | null = scope; owner && owner !== Object.prototype; owner = Object.getPrototypeOf(owner)) {
    if (Object.hasOwn(owner, name)) {
      Reflect.deleteProperty(owner, name);
    }
  }
  if (name in scope) {
    Object.defineProperty(scope, name, { value: undefined, configurable: false, writable: false });
  }
}

/**
 * Removes every global in `NETWORK_GLOBALS`.
 */
export function removeNetworkGlobals(scope: WorkerScope): void {
  for (const name of NETWORK_GLOBALS) {
    removeGlobal(scope, name);
  }
}

/**
 * Makes `setTimeout`/`setInterval` refuse string handlers (they are `eval` in disguise). Safe before the runtime loads.
 */
export function refuseStringTimers(scope: WorkerScope, sandbox: string): void {
  for (const name of STRING_TIMERS) {
    const original = scope[name];
    if (typeof original !== 'function') {
      continue;
    }
    const guarded = function (this: unknown, handler: unknown, ...rest: unknown[]) {
      if (typeof handler !== 'function') {
        throw new TypeError(`${name} only accepts a function in the ${sandbox} sandbox.`);
      }
      return Reflect.apply(original, scope, [handler, ...rest]);
    };
    Object.defineProperty(scope, name, { value: guarded, configurable: true, writable: true });
  }
}

/**
 * Replaces `Function`, `eval` and every function constructor reachable as `fn.constructor` (plain, async, generator, async generator)
 * with stand-ins that throw `EvalError`, keeping `instanceof Function` and `Function.prototype` working. The worker CSP already blocks
 * string compilation; this makes the failure explicit and independent of the header.
 */
export function blockCodeGeneration(scope: WorkerScope, message: string): void {
  const original = scope.Function as { prototype: object };
  const blockedFunction = function blockedFunction(): never {
    throw new EvalError(message);
  };
  Object.defineProperty(blockedFunction, 'prototype', { value: original.prototype, writable: false });
  const blockedEval = function blockedCodeGeneration(): never {
    throw new EvalError(message);
  };
  Object.defineProperty(scope, 'Function', { value: blockedFunction, configurable: false, writable: false });
  Object.defineProperty(scope, 'eval', { value: blockedEval, configurable: false, writable: false });
  const samples = [function () {}, async function () {}, function* () {}, async function* () {}];
  for (const sample of samples) {
    Object.defineProperty(Object.getPrototypeOf(sample), 'constructor', { value: blockedFunction, configurable: false, writable: false });
  }
}
