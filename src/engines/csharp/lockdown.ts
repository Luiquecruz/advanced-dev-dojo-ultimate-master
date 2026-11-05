import { blockCodeGeneration, refuseStringTimers, removeGlobal, removeNetworkGlobals, type WorkerScope } from '../shared/workerLockdown';

const CODE_GENERATION_DISABLED = 'Code generation is disabled in the C# sandbox.';
const BINDING_DISABLED = 'Binding JavaScript functions is disabled in the C# sandbox.';

/**
 * Globals the .NET runtime publishes on the worker scope. `getDotnetRuntime(id)` hands out the runtime API (its Emscripten module,
 * file system and `INTERNAL`), which learner code could reach through `JSHost.GlobalThis`; the worker keeps its own reference.
 */
export const DOTNET_RUNTIME_GLOBALS = ['getDotnetRuntime', 'dotnetDebugger', 'dotnetSidecar'] as const;

/**
 * Worker globals with no use once the runtime has booted that reach the page, persistent storage or devices: the worker's own
 * `postMessage` (the worker keeps a bound copy), `close`, `onmessage`, `navigator` (storage and the origin private file system, locks,
 * GPU, USB, HID, serial, permissions), the file system handles, `OffscreenCanvas` and `Notification`.
 */
export const DOTNET_WORKER_GLOBALS = [
  'postMessage', 'close', 'onmessage', 'onmessageerror', 'navigator', 'OffscreenCanvas', 'Notification', 'FileSystemHandle',
  'FileSystemFileHandle', 'FileSystemDirectoryHandle', 'FileSystemSyncAccessHandle', 'FileSystemWritableFileStream', 'StorageManager',
] as const;

/**
 * Members of the runtime's `INTERNAL` object that reach the network, load code or assemblies, or reach the Node host. Learner C# can
 * bind and call any function under `INTERNAL.<path>` through `JSFunctionBinding.BindJSFunction`, so these go after the boot; the
 * BCL code that uses them (`System.Net.Http`, `System.Net.WebSockets`, `JSHost.ImportAsync`, lazy assemblies) is not shipped or not needed.
 */
export const DOTNET_INTERNAL_MEMBERS = ['require', 'process', 'dynamic_import', 'loadLazyAssembly', 'loadSatelliteAssemblies'] as const;

const DOTNET_INTERNAL_PREFIXES = ['http_wasm_', 'ws_wasm_', 'ws_get_'] as const;

/**
 * Removes `DOTNET_INTERNAL_MEMBERS` and the HTTP and WebSocket bindings from the runtime's `INTERNAL` object (spike finding C3).
 */
export function lockDownDotnetInternals(internal: Record<string, unknown>): void {
  for (const name of Object.keys(internal)) {
    if ((DOTNET_INTERNAL_MEMBERS as readonly string[]).includes(name) || DOTNET_INTERNAL_PREFIXES.some((prefix) => name.startsWith(prefix))) {
      removeGlobal(internal, name);
    }
  }
}

/**
 * Makes `Function.prototype.bind` throw. The runtime turns every `[JSImport]` and every `JSFunctionBinding.BindJSFunction` call into
 * `fn.bind(owner)` for a function found by name under `globalThis`, `INTERNAL` or a registered module, and nowhere else calls `bind`
 * after the boot. Learner C# can reach `BindJSFunction` (with `DynamicMethod`, spike review), so this closes the call channel itself:
 * only the bindings made during the boot and the warm-up (the host's `dojo-host` `emit`) keep working.
 */
export function blockFunctionBinding(functionPrototype: object): void {
  Object.defineProperty(functionPrototype, 'bind', {
    value: function bind(): never {
      throw new TypeError(BINDING_DISABLED);
    },
    configurable: false,
    writable: false,
  });
}

/**
 * Makes `setTimeout`/`setInterval` refuse string handlers. Safe before the runtime loads.
 */
export function refuseCsharpStringTimers(scope: WorkerScope): void {
  refuseStringTimers(scope, 'C#');
}

/**
 * Runs once the .NET runtime has booted and before any learner code (spike findings C1 and C2, and the engine review): learner C#
 * reaches the worker's JavaScript through `System.Runtime.InteropServices.JavaScript` (by reflection even though its reference
 * assembly is withheld), and `HttpClient` uses the browser `fetch`. Blocks new JavaScript bindings (`blockFunctionBinding`, the
 * boundary), and behind it removes the network, runtime and worker globals and the runtime's loaders, and replaces `Function`, `eval`
 * and every function constructor with throwing stand-ins. `internal` is the runtime's `INTERNAL` object; `functionPrototype` is only
 * passed by unit tests, which must not lock their own realm.
 */
export function lockDownCsharp(scope: WorkerScope, internal?: Record<string, unknown>, functionPrototype: object = Function.prototype): void {
  removeNetworkGlobals(scope);
  for (const name of [...DOTNET_RUNTIME_GLOBALS, ...DOTNET_WORKER_GLOBALS]) {
    removeGlobal(scope, name);
  }
  if (internal) {
    lockDownDotnetInternals(internal);
  }
  blockCodeGeneration(scope, CODE_GENERATION_DISABLED);
  blockFunctionBinding(functionPrototype);
}
