import { DOTNET_INTERNAL_MEMBERS, DOTNET_RUNTIME_GLOBALS } from '../engines/csharp/lockdown';
import { NETWORK_GLOBALS } from '../engines/shared/workerLockdown';

/**
 * Escape scan for the C# sandbox (spike finding C3), the counterpart of `pythonEscapeScan.py`. Learner C# reaches JavaScript through
 * `JSHost.GlobalThis` (property reads by reflection) and `JSFunctionBinding.BindJSFunction`, which binds and calls any function at a
 * dotted path under `globalThis` or the runtime's `INTERNAL` object. So everything reachable by property names from those two roots is
 * treated as callable, and the scan reports every original code generator, network API, loader and Node host object found there.
 */

const NODE_PROCESS_MEMBERS = ['binding', '_linkedBinding', 'dlopen', 'getBuiltinModule', 'kill', 'exit', 'reallyExit', '_debugProcess', 'send'] as const;
const NODE_FS_MEMBERS = ['readFileSync', 'writeFileSync', 'openSync'] as const;
const INTERNAL_PREFIXES = ['http_wasm_', 'ws_wasm_', 'ws_get_'] as const;

export interface EscapeScanResult {
  findings: string[];
  visited: number;
}

/**
 * Captures, before the lock-down, every host capability the scan must not find afterwards, keyed by identity.
 */
export function dangerousOriginals(scope: Record<string, unknown>, internal: Record<string, unknown>): Map<unknown, string> {
  const originals = new Map<unknown, string>();
  const add = (value: unknown, label: string) => {
    if ((typeof value === 'function' || (typeof value === 'object' && value !== null)) && !originals.has(value)) {
      originals.set(value, label);
    }
  };
  add(scope.Function, 'code generator Function');
  add(scope.eval, 'code generator eval');
  for (const sample of [async function () {}, function* () {}, async function* () {}]) {
    const constructor = Object.getPrototypeOf(sample).constructor as { name: string };
    add(constructor, `code generator ${constructor.name}`);
  }
  for (const name of [...NETWORK_GLOBALS, ...DOTNET_RUNTIME_GLOBALS]) {
    add(scope[name], `global ${name}`);
  }
  const getRuntime = scope.getDotnetRuntime;
  if (typeof getRuntime === 'function') {
    add(getRuntime(0), 'runtime API (getDotnetRuntime)');
  }
  const host = scope.process as Record<string, unknown> | undefined;
  if (host) {
    add(host, 'Node process');
    for (const name of NODE_PROCESS_MEMBERS) {
      add(host[name], `Node process.${name}`);
    }
  }
  for (const [name, value] of Object.entries(internal)) {
    if ((DOTNET_INTERNAL_MEMBERS as readonly string[]).includes(name) || INTERNAL_PREFIXES.some((prefix) => name.startsWith(prefix))) {
      add(value, `INTERNAL.${name}`);
    }
  }
  return originals;
}

function isObject(value: unknown): value is object {
  return (typeof value === 'object' && value !== null) || typeof value === 'function';
}

function keyLabel(key: string | symbol): string {
  return typeof key === 'symbol' ? `[${key.toString()}]` : `.${key}`;
}

function capability(value: object, originals: Map<unknown, string>): string | undefined {
  const original = originals.get(value);
  if (original) {
    return original;
  }
  try {
    if (NODE_FS_MEMBERS.every((name) => Object.hasOwn(value, name))) {
      return 'Node fs module';
    }
  } catch {
    return undefined;
  }
  return undefined;
}

/**
 * Walks every object reachable from `roots` through own string and symbol keys (getters included, as C# reads properties through
 * them) and prototypes, and returns `"<capability> at <path>"` for each original in `originals` or Node `fs` module it finds.
 */
export function scanReachable(roots: [unknown, string][], originals: Map<unknown, string>, maxNodes = 200000, maxDepth = 12): EscapeScanResult {
  const seen = new WeakSet<object>();
  const findings: string[] = [];
  const stack: [unknown, string, number][] = roots.map(([value, path]) => [value, path, 0]);
  let visited = 0;
  while (stack.length > 0 && visited < maxNodes) {
    const [value, path, depth] = stack.pop()!;
    if (!isObject(value) || seen.has(value)) {
      continue;
    }
    seen.add(value);
    visited += 1;
    const found = capability(value, originals);
    if (found) {
      findings.push(`${found} at ${path}`);
    }
    if (depth >= maxDepth || ArrayBuffer.isView(value) || value instanceof ArrayBuffer || (typeof SharedArrayBuffer === 'function' && value instanceof SharedArrayBuffer)) {
      continue;
    }
    let keys: (string | symbol)[];
    try {
      keys = Reflect.ownKeys(value);
    } catch {
      continue;
    }
    for (const key of keys) {
      try {
        stack.push([Reflect.get(value, key), `${path}${keyLabel(key)}`, depth + 1]);
      } catch {
        continue;
      }
    }
    try {
      stack.push([Object.getPrototypeOf(value), `${path}.__proto__`, depth + 1]);
    } catch {
      continue;
    }
  }
  return { findings, visited };
}
