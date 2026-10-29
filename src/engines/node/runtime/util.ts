import { isEqual } from '../../shared/expect';

type AnyFunction = (...args: any[]) => any;

const CUSTOM_PROMISIFY = Symbol.for('nodejs.util.promisify.custom');

export function promisify(original: AnyFunction): AnyFunction {
  if (typeof original !== 'function') {
    throw new TypeError('The "original" argument must be of type function');
  }
  const custom = (original as any)[CUSTOM_PROMISIFY];
  if (typeof custom === 'function') {
    return custom;
  }
  return function (this: unknown, ...args: unknown[]) {
    return new Promise((resolve, reject) => {
      original.call(this, ...args, (error: unknown, value: unknown) => (error ? reject(error) : resolve(value)));
    });
  };
}

promisify.custom = CUSTOM_PROMISIFY;

export function callbackify(original: (...args: any[]) => Promise<unknown>): AnyFunction {
  return function (this: unknown, ...args: unknown[]) {
    const callback = args.pop() as (error: unknown, value?: unknown) => void;
    original.apply(this, args).then(
      (value) => queueMicrotask(() => callback(null, value)),
      (error) => queueMicrotask(() => callback(error ?? new Error('Promise was rejected with a falsy value'))),
    );
  };
}

function quote(text: string): string {
  return `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;
}

function key(name: string | symbol): string {
  if (typeof name === 'symbol') {
    return `[${name.toString()}]`;
  }
  return /^[A-Za-z_$][\w$]*$/.test(name) ? name : quote(name);
}

function wrap(open: string, items: string[], close: string, indent: string): string {
  if (items.length === 0) {
    return `${open}${close}`;
  }
  const inline = `${open} ${items.join(', ')} ${close}`;
  if (inline.length <= 72 && !items.some((item) => item.includes('\n'))) {
    return inline;
  }
  return `${open}\n${items.map((item) => `${indent}  ${item}`).join(',\n')}\n${indent}${close}`;
}

export function inspect(value: unknown, options: { depth?: number } = {}, depth = 0, seen = new WeakSet<object>(), indent = ''): string {
  const maxDepth = options.depth ?? 2;
  if (typeof value === 'string') {
    return quote(value);
  }
  if (typeof value === 'bigint') {
    return `${value}n`;
  }
  if (typeof value === 'symbol') {
    return value.toString();
  }
  if (typeof value === 'function') {
    return /^class\s/.test(Function.prototype.toString.call(value)) ? `[class ${value.name || '(anonymous)'}]` : `[Function: ${value.name || '(anonymous)'}]`;
  }
  if (value === null || typeof value !== 'object') {
    return Object.is(value, -0) ? '-0' : String(value);
  }
  if (seen.has(value)) {
    return '[Circular *1]';
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? 'Invalid Date' : value.toISOString();
  }
  if (value instanceof RegExp) {
    return value.toString();
  }
  if (value instanceof Error) {
    const code = (value as { code?: unknown }).code;
    return `${value.stack ?? `${value.name}: ${value.message}`}${code ? ` {\n${indent}  code: ${quote(String(code))}\n${indent}}` : ''}`;
  }
  if (value instanceof Promise) {
    return 'Promise { <pending> }';
  }
  if (value instanceof Uint8Array && value.constructor.name === 'Buffer') {
    const bytes = [...value.slice(0, 50)].map((byte) => byte.toString(16).padStart(2, '0'));
    return `<Buffer ${bytes.join(' ')}${value.length > 50 ? ` ... ${value.length - 50} more bytes` : ''}>`;
  }
  if (depth > maxDepth) {
    return Array.isArray(value) ? '[Array]' : `[${value.constructor?.name ?? 'Object'}]`;
  }
  seen.add(value);
  const nested = (item: unknown) => inspect(item, options, depth + 1, seen, `${indent}  `);
  let result: string;
  if (Array.isArray(value)) {
    const items = value.slice(0, 100).map(nested);
    if (value.length > 100) {
      items.push(`... ${value.length - 100} more items`);
    }
    result = wrap('[', items, ']', indent);
  } else if (value instanceof Map) {
    result = `Map(${value.size}) ${wrap('{', [...value].map(([entryKey, entryValue]) => `${nested(entryKey)} => ${nested(entryValue)}`), '}', indent)}`;
  } else if (value instanceof Set) {
    result = `Set(${value.size}) ${wrap('{', [...value].map(nested), '}', indent)}`;
  } else {
    const name = value.constructor && value.constructor !== Object ? `${value.constructor.name} ` : Object.getPrototypeOf(value) === null ? '[Object: null prototype] ' : '';
    const entries = Reflect.ownKeys(value)
      .filter((property) => Object.prototype.propertyIsEnumerable.call(value, property))
      .map((property) => `${key(property)}: ${nested((value as Record<string | symbol, unknown>)[property])}`);
    result = `${name}${wrap('{', entries, '}', indent)}`;
  }
  seen.delete(value);
  return result;
}

inspect.custom = Symbol.for('nodejs.util.inspect.custom');

export function format(template?: unknown, ...args: unknown[]): string {
  if (typeof template !== 'string') {
    return [template, ...args].map((item) => (typeof item === 'string' ? item : inspect(item))).join(' ');
  }
  let index = 0;
  const text = template.replace(/%[sdifjoOc%]/g, (token) => {
    if (token === '%%') {
      return '%';
    }
    if (index >= args.length) {
      return token;
    }
    const arg = args[index++];
    switch (token) {
      case '%s':
        return typeof arg === 'string' ? arg : typeof arg === 'object' && arg !== null ? inspect(arg, { depth: 0 }) : String(arg);
      case '%d':
      case '%i':
        return String(token === '%i' ? Math.trunc(Number(arg)) : Number(arg));
      case '%f':
        return String(Number(arg));
      case '%j':
        return JSON.stringify(arg);
      case '%c':
        return '';
      default:
        return inspect(arg);
    }
  });
  return [text, ...args.slice(index).map((item) => (typeof item === 'string' ? item : inspect(item)))].join(' ');
}

export function isDeepStrictEqual(first: unknown, second: unknown): boolean {
  return isEqual(first, second);
}

export function deprecate<T extends AnyFunction>(original: T, message: string, code?: string): T {
  let warned = false;
  return function (this: unknown, ...args: unknown[]) {
    if (!warned) {
      warned = true;
      console.warn(`${code ? `[${code}] ` : ''}DeprecationWarning: ${message}`);
    }
    return original.apply(this, args);
  } as T;
}

export function debuglog(): AnyFunction {
  return () => undefined;
}

export function styleText(_format: string | string[], text: string): string {
  return text;
}

export function stripVTControlCharacters(text: string): string {
  return text.replace(/\u001b\[[0-9;]*m/g, '');
}

interface ParseArgsOption {
  type: 'string' | 'boolean';
  short?: string;
  multiple?: boolean;
  default?: string | boolean | string[] | boolean[];
}

interface ParseArgsConfig {
  args?: string[];
  options?: Record<string, ParseArgsOption>;
  strict?: boolean;
  allowPositionals?: boolean;
}

function argsError(code: string, message: string): TypeError {
  return Object.assign(new TypeError(message), { code });
}

export function parseArgs({ args = [], options = {}, strict = true, allowPositionals = !strict }: ParseArgsConfig = {}) {
  const values: Record<string, unknown> = Object.create(null);
  const positionals: string[] = [];
  const byShort = new Map(Object.entries(options).flatMap(([name, option]) => (option.short ? [[option.short, name] as const] : [])));

  const store = (name: string, value: string | boolean) => {
    const option = options[name];
    if (option?.multiple) {
      values[name] = [...((values[name] as unknown[]) ?? []), value];
    } else {
      values[name] = value;
    }
  };

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--') {
      positionals.push(...args.slice(index + 1));
      break;
    }
    const long = /^--([^=]+)(?:=(.*))?$/.exec(arg);
    const short = /^-([^-])$/.exec(arg);
    const name = long ? long[1] : short ? (byShort.get(short[1]) ?? short[1]) : undefined;
    if (name === undefined) {
      if (strict && !allowPositionals) {
        throw argsError('ERR_PARSE_ARGS_UNEXPECTED_POSITIONAL', `Unexpected argument '${arg}'. This command does not take positional arguments`);
      }
      positionals.push(arg);
      continue;
    }
    const option = options[name];
    if (!option) {
      if (strict) {
        throw argsError('ERR_PARSE_ARGS_UNKNOWN_OPTION', `Unknown option '${arg}'`);
      }
      store(name, long?.[2] ?? true);
      continue;
    }
    if (option.type === 'boolean') {
      if (long?.[2] !== undefined && strict) {
        throw argsError('ERR_PARSE_ARGS_INVALID_OPTION_VALUE', `Option '--${name}' does not take an argument`);
      }
      store(name, true);
      continue;
    }
    const inline = long?.[2];
    const value = inline ?? args[++index];
    if (value === undefined && strict) {
      throw argsError('ERR_PARSE_ARGS_INVALID_OPTION_VALUE', `Option '--${name} <value>' argument missing`);
    }
    store(name, value);
  }

  Object.entries(options).forEach(([name, option]) => {
    if (values[name] === undefined && option.default !== undefined) {
      values[name] = option.default;
    }
  });

  return { values: { ...values }, positionals };
}

export const types = {
  isPromise: (value: unknown) => value instanceof Promise,
  isDate: (value: unknown) => value instanceof Date,
  isRegExp: (value: unknown) => value instanceof RegExp,
  isMap: (value: unknown) => value instanceof Map,
  isSet: (value: unknown) => value instanceof Set,
  isNativeError: (value: unknown) => value instanceof Error,
  isAsyncFunction: (value: unknown) => typeof value === 'function' && value.constructor.name === 'AsyncFunction',
  isGeneratorFunction: (value: unknown) => typeof value === 'function' && /GeneratorFunction$/.test(value.constructor.name),
  isUint8Array: (value: unknown) => value instanceof Uint8Array,
};

export const TextEncoder = globalThis.TextEncoder;
export const TextDecoder = globalThis.TextDecoder;
