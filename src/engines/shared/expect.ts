export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssertionError';
  }
}

export interface MockFunction {
  (...args: any[]): any;
  mock: { calls: any[][]; results: any[] };
  mockReturnValue(value: any): MockFunction;
  mockResolvedValue(value: any): MockFunction;
  mockRejectedValue(value: any): MockFunction;
  mockReturnValueOnce(value: any): MockFunction;
  mockImplementation(implementation: (...args: any[]) => any): MockFunction;
  mockClear(): MockFunction;
  _isMockFunction: true;
}

/**
 * Creates a spy function that records its calls.
 */
export function fn(implementation?: (...args: any[]) => any): MockFunction {
  let current = implementation;
  const mock = function (this: unknown, ...args: any[]) {
    mock.mock.calls.push(args);
    const once = queued.shift();
    const implementation = once ?? base();
    const result = implementation ? implementation.apply(this, args) : undefined;
    mock.mock.results.push(result);
    return result;
  } as MockFunction;
  mock.mock = { calls: [], results: [] };
  mock._isMockFunction = true;
  mock.mockReturnValue = (value) => {
    current = () => value;
    return mock;
  };
  mock.mockResolvedValue = (value) => {
    current = () => Promise.resolve(value);
    return mock;
  };
  mock.mockRejectedValue = (value) => {
    current = () => Promise.reject(value);
    return mock;
  };
  const queued: Array<() => any> = [];
  const base = () => current;
  mock.mockReturnValueOnce = (value) => {
    queued.push(() => value);
    return mock;
  };
  mock.mockImplementation = (next) => {
    current = next;
    return mock;
  };
  mock.mockClear = () => {
    mock.mock.calls = [];
    mock.mock.results = [];
    return mock;
  };
  return mock;
}

/**
 * Formats any value for assertion messages.
 */
export function format(value: unknown): string {
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'function') {
    return `[Function ${value.name || 'anonymous'}]`;
  }
  if (typeof Element !== 'undefined' && value instanceof Element) {
    const html = value.outerHTML;
    return html.length > 160 ? `${html.slice(0, 160)}…` : html;
  }
  try {
    const text = JSON.stringify(value);
    return text === undefined ? String(value) : text;
  } catch {
    return String(value);
  }
}

/**
 * Compares two values structurally.
 */
export function isEqual(a: any, b: any): boolean {
  if (Object.is(a, b)) {
    return true;
  }
  if (isAsymmetric(b)) {
    return b.asymmetricMatch(a);
  }
  if (isAsymmetric(a)) {
    return a.asymmetricMatch(b);
  }
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }
  if (Array.isArray(a) !== Array.isArray(b)) {
    return false;
  }
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  if (a instanceof Map && b instanceof Map) {
    return a.size === b.size && [...a].every(([key, value]) => b.has(key) && isEqual(value, b.get(key)));
  }
  if (a instanceof Set && b instanceof Set) {
    return a.size === b.size && [...a].every((value) => b.has(value));
  }
  const keysA = Object.keys(a).filter((key) => a[key] !== undefined);
  const keysB = Object.keys(b).filter((key) => b[key] !== undefined);
  if (keysA.length !== keysB.length) {
    return false;
  }
  return keysA.every((key) => isEqual(a[key], b[key]));
}

interface AsymmetricMatcher {
  asymmetricMatch(actual: unknown): boolean;
  toJSON(): string;
}

function isAsymmetric(value: any): value is AsymmetricMatcher {
  return value !== null && typeof value === 'object' && typeof value.asymmetricMatch === 'function';
}

function asymmetric(description: string, match: (actual: any) => boolean): AsymmetricMatcher {
  return { asymmetricMatch: match, toJSON: () => description };
}

const asymmetricMatchers = {
  anything: () => asymmetric('Anything', (actual) => actual !== null && actual !== undefined),
  any: (constructor: any) =>
    asymmetric(`Any<${constructor?.name}>`, (actual) => {
      if (constructor === String) return typeof actual === 'string' || actual instanceof String;
      if (constructor === Number) return typeof actual === 'number' || actual instanceof Number;
      if (constructor === Boolean) return typeof actual === 'boolean' || actual instanceof Boolean;
      if (constructor === Function) return typeof actual === 'function';
      return actual instanceof constructor;
    }),
  objectContaining: (expected: Record<string, unknown>) =>
    asymmetric(`ObjectContaining ${format(expected)}`, (actual) =>
      actual !== null && typeof actual === 'object' && Object.entries(expected).every(([key, value]) => isEqual(actual[key], value)),
    ),
  arrayContaining: (expected: unknown[]) =>
    asymmetric(`ArrayContaining ${format(expected)}`, (actual) => Array.isArray(actual) && expected.every((item) => actual.some((entry) => isEqual(entry, item)))),
  stringContaining: (expected: string) => asymmetric(`StringContaining ${format(expected)}`, (actual) => typeof actual === 'string' && actual.includes(expected)),
  stringMatching: (expected: RegExp | string) =>
    asymmetric(`StringMatching ${String(expected)}`, (actual) => typeof actual === 'string' && new RegExp(expected).test(actual)),
};

function isMock(value: any): value is MockFunction {
  return typeof value === 'function' && value._isMockFunction === true;
}

function assertElement(value: any, matcher: string): asserts value is HTMLElement {
  if (!(value instanceof Element)) {
    throw new AssertionError(`${matcher}() expects a DOM element, received ${format(value)}.`);
  }
}

function normalizeText(text: string | null): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

type MatcherResult = { pass: boolean; message: string; negatedMessage: string };
type Matcher = (received: any, ...expected: any[]) => MatcherResult;

const matchers: Record<string, Matcher> = {
  toBe: (received, expected) => ({
    pass: Object.is(received, expected),
    message: `Expected ${format(received)} to be ${format(expected)}.`,
    negatedMessage: `Expected value not to be ${format(expected)}.`,
  }),
  toEqual: (received, expected) => ({
    pass: isEqual(received, expected),
    message: `Expected ${format(received)} to equal ${format(expected)}.`,
    negatedMessage: `Expected value not to equal ${format(expected)}.`,
  }),
  toStrictEqual: (received, expected) => matchers.toEqual(received, expected),
  toBeTruthy: (received) => ({
    pass: Boolean(received),
    message: `Expected ${format(received)} to be truthy.`,
    negatedMessage: `Expected ${format(received)} to be falsy.`,
  }),
  toBeFalsy: (received) => ({
    pass: !received,
    message: `Expected ${format(received)} to be falsy.`,
    negatedMessage: `Expected ${format(received)} to be truthy.`,
  }),
  toBeNull: (received) => ({
    pass: received === null,
    message: `Expected ${format(received)} to be null.`,
    negatedMessage: 'Expected value not to be null.',
  }),
  toBeUndefined: (received) => ({
    pass: received === undefined,
    message: `Expected ${format(received)} to be undefined.`,
    negatedMessage: 'Expected value not to be undefined.',
  }),
  toBeDefined: (received) => ({
    pass: received !== undefined,
    message: 'Expected value to be defined.',
    negatedMessage: `Expected ${format(received)} to be undefined.`,
  }),
  toBeTypeOf: (received, type) => ({
    pass: typeof received === type,
    message: `Expected ${format(received)} to be of type ${type}, got ${typeof received}.`,
    negatedMessage: `Expected value not to be of type ${type}.`,
  }),
  toBeInstanceOf: (received, constructor) => ({
    pass: received instanceof constructor,
    message: `Expected value to be an instance of ${constructor?.name}.`,
    negatedMessage: `Expected value not to be an instance of ${constructor?.name}.`,
  }),
  toContain: (received, item) => ({
    pass: received != null && received.includes(item),
    message: `Expected ${format(received)} to contain ${format(item)}.`,
    negatedMessage: `Expected ${format(received)} not to contain ${format(item)}.`,
  }),
  toContainEqual: (received, item) => ({
    pass: Array.isArray(received) && received.some((entry) => isEqual(entry, item)),
    message: `Expected ${format(received)} to contain an item equal to ${format(item)}.`,
    negatedMessage: `Expected ${format(received)} not to contain an item equal to ${format(item)}.`,
  }),
  toMatch: (received, pattern) => ({
    pass: typeof received === 'string' && (pattern instanceof RegExp ? pattern.test(received) : received.includes(pattern)),
    message: `Expected ${typeof received === 'string' && received.length > 200 ? 'your code' : format(received)} to match ${String(pattern)}.`,
    negatedMessage: `Expected ${typeof received === 'string' && received.length > 200 ? 'your code' : format(received)} not to match ${String(pattern)}.`,
  }),
  toHaveLength: (received, length) => ({
    pass: received != null && received.length === length,
    message: `Expected length ${length}, received ${received?.length}.`,
    negatedMessage: `Expected length not to be ${length}.`,
  }),
  toHaveProperty: (received, key, value) => {
    const has = received != null && key in Object(received);
    const pass = has && (value === undefined || isEqual(received[key], value));
    return {
      pass,
      message: `Expected object to have property "${key}"${value === undefined ? '' : ` equal to ${format(value)}`}.`,
      negatedMessage: `Expected object not to have property "${key}".`,
    };
  },
  toBeGreaterThan: (received, expected) => ({
    pass: received > expected,
    message: `Expected ${format(received)} to be greater than ${format(expected)}.`,
    negatedMessage: `Expected ${format(received)} not to be greater than ${format(expected)}.`,
  }),
  toBeGreaterThanOrEqual: (received, expected) => ({
    pass: received >= expected,
    message: `Expected ${format(received)} to be >= ${format(expected)}.`,
    negatedMessage: `Expected ${format(received)} to be < ${format(expected)}.`,
  }),
  toBeLessThan: (received, expected) => ({
    pass: received < expected,
    message: `Expected ${format(received)} to be less than ${format(expected)}.`,
    negatedMessage: `Expected ${format(received)} not to be less than ${format(expected)}.`,
  }),
  toBeLessThanOrEqual: (received, expected) => ({
    pass: received <= expected,
    message: `Expected ${format(received)} to be <= ${format(expected)}.`,
    negatedMessage: `Expected ${format(received)} to be > ${format(expected)}.`,
  }),
  toThrow: (received, expected) => {
    let thrown: any = null;
    try {
      received();
    } catch (error) {
      thrown = error ?? new Error('Thrown');
    }
    const messageMatches =
      thrown === null ||
      expected === undefined ||
      (typeof expected === 'function'
        ? thrown instanceof expected
        : expected instanceof RegExp
          ? expected.test(thrown.message)
          : String(thrown.message).includes(expected instanceof Error ? expected.message : expected));
    return {
      pass: thrown !== null && messageMatches,
      message:
        thrown === null
          ? 'Expected function to throw.'
          : typeof expected === 'function'
            ? `Expected an instance of ${expected.name}, got ${thrown?.name ?? typeof thrown}: "${thrown.message}".`
            : `Expected error message to match ${String(expected)}, got "${thrown.message}".`,
      negatedMessage: `Expected function not to throw, but it threw "${thrown?.message}".`,
    };
  },
  toHaveBeenCalled: (received) => {
    if (!isMock(received)) throw new AssertionError('toHaveBeenCalled() expects a mock created with fn().');
    return {
      pass: received.mock.calls.length > 0,
      message: 'Expected function to have been called.',
      negatedMessage: `Expected function not to have been called, but it was called ${received.mock.calls.length} time(s).`,
    };
  },
  toHaveBeenCalledTimes: (received, times) => {
    if (!isMock(received)) throw new AssertionError('toHaveBeenCalledTimes() expects a mock created with fn().');
    return {
      pass: received.mock.calls.length === times,
      message: `Expected function to have been called ${times} time(s), got ${received.mock.calls.length}.`,
      negatedMessage: `Expected function not to have been called ${times} time(s).`,
    };
  },
  toHaveBeenCalledWith: (received, ...args) => {
    if (!isMock(received)) throw new AssertionError('toHaveBeenCalledWith() expects a mock created with fn().');
    return {
      pass: received.mock.calls.some((call) => isEqual(call, args)),
      message: `Expected function to have been called with ${format(args)}. Calls: ${format(received.mock.calls)}.`,
      negatedMessage: `Expected function not to have been called with ${format(args)}.`,
    };
  },
  toHaveBeenLastCalledWith: (received, ...args) => {
    if (!isMock(received)) throw new AssertionError('toHaveBeenLastCalledWith() expects a mock created with fn().');
    const last = received.mock.calls[received.mock.calls.length - 1];
    return {
      pass: isEqual(last, args),
      message: `Expected last call to be ${format(args)}, got ${format(last)}.`,
      negatedMessage: `Expected last call not to be ${format(args)}.`,
    };
  },
  toBeInTheDocument: (received) => ({
    pass: received instanceof Element && received.ownerDocument.contains(received),
    message: `Expected element to be in the document, received ${format(received)}.`,
    negatedMessage: 'Expected element not to be in the document.',
  }),
  toHaveTextContent: (received, expected) => {
    assertElement(received, 'toHaveTextContent');
    const text = normalizeText(received.textContent);
    return {
      pass: expected instanceof RegExp ? expected.test(text) : text.includes(String(expected)),
      message: `Expected element text ${format(text)} to contain ${String(expected)}.`,
      negatedMessage: `Expected element text ${format(text)} not to contain ${String(expected)}.`,
    };
  },
  toHaveAttribute: (received, name, value) => {
    assertElement(received, 'toHaveAttribute');
    const actual = received.getAttribute(name);
    return {
      pass: received.hasAttribute(name) && (value === undefined || actual === String(value)),
      message: `Expected element to have attribute ${name}${value === undefined ? '' : `="${value}"`}, got ${format(actual)}.`,
      negatedMessage: `Expected element not to have attribute ${name}.`,
    };
  },
  toHaveValue: (received, value) => {
    assertElement(received, 'toHaveValue');
    const element = received as HTMLInputElement;
    const actual = element.type === 'number' ? (element.value === '' ? null : Number(element.value)) : element.value;
    return {
      pass: isEqual(actual, value),
      message: `Expected element value to be ${format(value)}, got ${format(actual)}.`,
      negatedMessage: `Expected element value not to be ${format(value)}.`,
    };
  },
  toBeChecked: (received) => {
    assertElement(received, 'toBeChecked');
    return {
      pass: (received as HTMLInputElement).checked === true || received.getAttribute('aria-checked') === 'true',
      message: 'Expected element to be checked.',
      negatedMessage: 'Expected element not to be checked.',
    };
  },
  toBeDisabled: (received) => {
    assertElement(received, 'toBeDisabled');
    return {
      pass: (received as HTMLButtonElement).disabled === true || received.getAttribute('aria-disabled') === 'true',
      message: `Expected element to be disabled: ${format(received)}.`,
      negatedMessage: `Expected element to be enabled: ${format(received)}.`,
    };
  },
  toBeEnabled: (received) => {
    const result = matchers.toBeDisabled(received);
    return { pass: !result.pass, message: result.negatedMessage, negatedMessage: result.message };
  },
  toHaveClass: (received, ...classNames) => {
    assertElement(received, 'toHaveClass');
    return {
      pass: classNames.every((name) => received.classList.contains(name)),
      message: `Expected element to have class(es) ${classNames.join(' ')}, got "${received.className}".`,
      negatedMessage: `Expected element not to have class(es) ${classNames.join(' ')}.`,
    };
  },
  toHaveStyle: (received, styles: Record<string, string | number>) => {
    assertElement(received, 'toHaveStyle');
    const computed = getComputedStyle(received);
    const mismatches = Object.entries(styles).filter(([property, value]) => {
      const cssProperty = property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
      const actual = received.style.getPropertyValue(cssProperty) || computed.getPropertyValue(cssProperty);
      const expectedValue = typeof value === 'number' && value !== 0 ? `${value}px` : String(value);
      return actual.trim() !== expectedValue;
    });
    return {
      pass: mismatches.length === 0,
      message: `Expected element to have style ${format(styles)}. Inline style: "${received.getAttribute('style') ?? ''}".`,
      negatedMessage: `Expected element not to have style ${format(styles)}.`,
    };
  },
  toHaveFocus: (received) => {
    assertElement(received, 'toHaveFocus');
    return {
      pass: received.ownerDocument.activeElement === received,
      message: `Expected element to have focus. Focused: ${format(received.ownerDocument.activeElement)}.`,
      negatedMessage: 'Expected element not to have focus.',
    };
  },
};

type Assertions = { [K in keyof typeof matchers]: (...expected: any[]) => void };

function createExpect(received: any): Assertions & { not: Assertions; resolves: Assertions; rejects: Assertions } {
  const build = (negated: boolean) =>
    Object.fromEntries(
      Object.entries(matchers).map(([name, matcher]) => [
        name,
        (...expected: any[]) => {
          const result = matcher(received, ...expected);
          if (result.pass === negated) {
            throw new AssertionError(negated ? result.negatedMessage : result.message);
          }
        },
      ]),
    ) as Assertions;

  const buildAsync = (mode: 'resolves' | 'rejects') =>
    Object.fromEntries(
      Object.keys(matchers).map((name) => [
        name,
        async (...expected: any[]) => {
          let value: any;
          try {
            value = await received;
            if (mode === 'rejects') throw new AssertionError('Expected promise to reject, but it resolved.');
          } catch (error) {
            if (mode === 'resolves' || error instanceof AssertionError) throw error;
            value = error;
          }
          const subject = name === 'toThrow' ? () => { throw value; } : value;
          (createExpect(subject) as any)[name](...expected);
        },
      ]),
    ) as Assertions;

  return Object.assign(build(false), { not: build(true), resolves: buildAsync('resolves'), rejects: buildAsync('rejects') });
}

/**
 * Minimal Jest/Vitest compatible expect with asymmetric matchers.
 */
export const expect = Object.assign(createExpect, asymmetricMatchers);
