import type { RuntimeOutcome, RuntimeTest, TestResult } from './types';

const IDENTIFIER_PATTERN = /^[A-Za-z_$][\w$]*$/;
const LOG_SETTLE_DELAY_MS = 100;
const MAX_FORMAT_DEPTH = 4;

type ConsoleLike = Pick<Console, 'log' | 'info' | 'warn' | 'error' | 'table'>;

type Evaluator = (source: string) => unknown;

export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssertionError';
  }
}

/**
 * Formats any runtime value into a readable single line string.
 */
export function formatValue(value: unknown, depth = 0, seen = new WeakSet<object>()): string {
  if (typeof value === 'string') {
    return depth === 0 ? value : JSON.stringify(value);
  }
  if (typeof value === 'bigint') {
    return `${value}n`;
  }
  if (typeof value === 'symbol' || typeof value === 'undefined' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'function') {
    return value.toString().startsWith('class') ? `[class ${value.name || 'anonymous'}]` : `[Function ${value.name || 'anonymous'}]`;
  }
  if (value === null) {
    return 'null';
  }
  if (seen.has(value)) {
    return '[Circular]';
  }
  if (depth > MAX_FORMAT_DEPTH) {
    return Array.isArray(value) ? '[Array]' : '[Object]';
  }
  seen.add(value);
  const nested = (item: unknown) => formatValue(item, depth + 1, seen);
  if (value instanceof Error) {
    return `${value.name}: ${value.message}`;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value instanceof RegExp) {
    return value.toString();
  }
  if (value instanceof Promise) {
    return 'Promise { <pending> }';
  }
  if (Array.isArray(value)) {
    return `[${value.map(nested).join(', ')}]`;
  }
  if (value instanceof Map) {
    return `Map(${value.size}) { ${[...value].map(([key, item]) => `${nested(key)} => ${nested(item)}`).join(', ')} }`;
  }
  if (value instanceof Set) {
    return `Set(${value.size}) { ${[...value].map(nested).join(', ')} }`;
  }
  const constructorName = Object.getPrototypeOf(value)?.constructor?.name;
  const prefix = constructorName && constructorName !== 'Object' ? `${constructorName} ` : '';
  const entries = Object.entries(value).map(([key, item]) => `${IDENTIFIER_PATTERN.test(key) ? key : JSON.stringify(key)}: ${nested(item)}`);
  return entries.length === 0 ? `${prefix}{}` : `${prefix}{ ${entries.join(', ')} }`;
}

function isDeepEqual(actual: unknown, expected: unknown): boolean {
  if (Object.is(actual, expected)) {
    return true;
  }
  if (typeof actual !== 'object' || typeof expected !== 'object' || actual === null || expected === null) {
    return false;
  }
  if (Object.getPrototypeOf(actual) !== Object.getPrototypeOf(expected)) {
    return false;
  }
  if (actual instanceof Date && expected instanceof Date) {
    return actual.getTime() === expected.getTime();
  }
  if (actual instanceof Map && expected instanceof Map) {
    return actual.size === expected.size && [...actual].every(([key, item]) => expected.has(key) && isDeepEqual(item, expected.get(key)));
  }
  if (actual instanceof Set && expected instanceof Set) {
    return actual.size === expected.size && [...actual].every((item) => expected.has(item));
  }
  const actualKeys = Object.keys(actual);
  const expectedKeys = Object.keys(expected);
  if (actualKeys.length !== expectedKeys.length) {
    return false;
  }
  return actualKeys.every(
    (key) => Object.prototype.hasOwnProperty.call(expected, key) && isDeepEqual((actual as Record<string, unknown>)[key], (expected as Record<string, unknown>)[key]),
  );
}

function fail(defaultMessage: string, message?: string): never {
  throw new AssertionError(message ?? defaultMessage);
}

/**
 * Assertion helpers available to runtime tests as `assert`.
 */
export const assert = {
  ok(value: unknown, message?: string): void {
    if (!value) {
      fail(`Expected a truthy value but received ${formatValue(value, 1)}`, message);
    }
  },
  equal(actual: unknown, expected: unknown, message?: string): void {
    if (!Object.is(actual, expected)) {
      fail(`Expected ${formatValue(expected, 1)} but received ${formatValue(actual, 1)}`, message);
    }
  },
  notEqual(actual: unknown, expected: unknown, message?: string): void {
    if (Object.is(actual, expected)) {
      fail(`Expected a value different from ${formatValue(expected, 1)}`, message);
    }
  },
  deepEqual(actual: unknown, expected: unknown, message?: string): void {
    if (!isDeepEqual(actual, expected)) {
      fail(`Expected ${formatValue(expected, 1)} but received ${formatValue(actual, 1)}`, message);
    }
  },
  throws(action: () => unknown, expected?: string | RegExp | (new (...args: never[]) => Error), message?: string): void {
    try {
      action();
    } catch (error) {
      assertErrorMatches(error, expected, message);
      return;
    }
    fail('Expected the function to throw, but it did not', message);
  },
  async rejects(action: Promise<unknown> | (() => Promise<unknown>), expected?: string | RegExp | (new (...args: never[]) => Error), message?: string): Promise<void> {
    try {
      await (typeof action === 'function' ? action() : action);
    } catch (error) {
      assertErrorMatches(error, expected, message);
      return;
    }
    fail('Expected the promise to reject, but it resolved', message);
  },
};

function assertErrorMatches(error: unknown, expected: string | RegExp | (new (...args: never[]) => Error) | undefined, message?: string): void {
  if (expected === undefined) {
    return;
  }
  const errorMessage = error instanceof Error ? error.message : String(error);
  if (typeof expected === 'string' && !errorMessage.includes(expected)) {
    fail(`Expected error message to include ${JSON.stringify(expected)} but received ${JSON.stringify(errorMessage)}`, message);
  }
  if (expected instanceof RegExp && !expected.test(errorMessage)) {
    fail(`Expected error message to match ${expected} but received ${JSON.stringify(errorMessage)}`, message);
  }
  if (typeof expected === 'function' && !(error instanceof expected)) {
    fail(`Expected an instance of ${expected.name} but received ${formatValue(error, 1)}`, message);
  }
}

function createConsole(logs: string[] | null): ConsoleLike {
  const write = (level: string) => (...data: unknown[]) => {
    logs?.push(`${level}${data.map((item) => formatValue(item)).join(' ')}`);
  };
  return {
    log: write(''),
    info: write(''),
    warn: write('⚠ '),
    error: write('✖ '),
    table: write(''),
  };
}

function requireModule(name: string): never {
  throw new Error(`Cannot import "${name}": modules are not available in this environment`);
}

function createScope(javascript: string, consoleObject: ConsoleLike): { evaluate: Evaluator; exportedNames: string[] } {
  const exportsObject: Record<string, unknown> = {};
  const moduleObject = { exports: exportsObject };
  const factory = new Function(
    'exports',
    'module',
    'require',
    'console',
    'assert',
    `${javascript}\nreturn function (__source__) { return eval(__source__); };`,
  ) as (...args: unknown[]) => Evaluator;
  const evaluate = factory(exportsObject, moduleObject, requireModule, consoleObject, assert);
  const exportedNames = Object.keys(moduleObject.exports).filter((name) => IDENTIFIER_PATTERN.test(name) && name !== 'default');
  return { evaluate, exportedNames };
}

function describeError(error: unknown): string {
  if (error instanceof AssertionError) {
    return error.message;
  }
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return `Thrown value: ${formatValue(error, 1)}`;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Test timed out after ${timeoutMs}ms`)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function collectLogs(javascript: string): Promise<string[]> {
  const logs: string[] = [];
  try {
    createScope(javascript, createConsole(logs));
  } catch (error) {
    logs.push(`✖ Uncaught ${describeError(error)}`);
  }
  await new Promise((resolve) => setTimeout(resolve, LOG_SETTLE_DELAY_MS));
  return logs;
}

async function runTest(javascript: string, test: RuntimeTest, timeoutMs: number): Promise<TestResult> {
  let scope: ReturnType<typeof createScope>;
  try {
    scope = createScope(javascript, createConsole(null));
  } catch (error) {
    return { name: test.name, kind: 'runtime', passed: false, message: `Your code threw while loading: ${describeError(error)}` };
  }
  const prelude = scope.exportedNames.length > 0 ? `var { ${scope.exportedNames.join(', ')} } = exports;` : '';
  try {
    const outcome = await withTimeout(Promise.resolve(scope.evaluate(`(async () => {\n${prelude}\n${test.code}\n})()`)), timeoutMs);
    if (outcome === false) {
      return { name: test.name, kind: 'runtime', passed: false, message: 'The check returned false.' };
    }
    return { name: test.name, kind: 'runtime', passed: true };
  } catch (error) {
    return { name: test.name, kind: 'runtime', passed: false, message: describeError(error) };
  }
}

/**
 * Executes the transpiled learner code once to capture console output, then runs each test in a fresh scope.
 */
export async function runRuntimeTests(javascript: string, tests: RuntimeTest[], timeoutMs = 2000): Promise<RuntimeOutcome> {
  const logs = await collectLogs(javascript);
  const results: TestResult[] = [];
  for (const test of tests) {
    results.push(await runTest(javascript, test, timeoutMs));
  }
  return { results, logs };
}
