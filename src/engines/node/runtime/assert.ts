import { isEqual } from '../../shared/expect';
import { inspect } from './util';

/**
 * Error thrown by node:assert.
 */
export class AssertionError extends Error {
  readonly code = 'ERR_ASSERTION';

  constructor(
    message: string,
    readonly actual?: unknown,
    readonly expected?: unknown,
    readonly operator?: string,
  ) {
    super(message);
    this.name = 'AssertionError';
  }
}

function fail(message: string | Error | undefined, fallback: string, actual?: unknown, expected?: unknown, operator?: string): never {
  if (message instanceof Error) {
    throw message;
  }
  throw new AssertionError(message ?? fallback, actual, expected, operator);
}

function matches(error: unknown, expected: unknown): boolean {
  if (expected === undefined) {
    return true;
  }
  if (expected instanceof RegExp) {
    return expected.test(error instanceof Error ? error.message : String(error));
  }
  if (typeof expected === 'function') {
    return expected.prototype !== undefined && error instanceof (expected as new () => unknown) ? true : expected.prototype === undefined && (expected as (value: unknown) => boolean)(error) === true;
  }
  if (typeof expected === 'object' && expected !== null) {
    return Object.entries(expected).every(([name, value]) => isEqual((error as Record<string, unknown>)?.[name], value));
  }
  return false;
}

function ok(value: unknown, message?: string | Error): asserts value {
  if (!value) {
    fail(message, `The expression evaluated to a falsy value:\n\n  assert.ok(${inspect(value)})`, value, true, '==');
  }
}

const assert = Object.assign((value: unknown, message?: string | Error) => ok(value, message), {
  AssertionError,
  ok,
  equal(actual: unknown, expected: unknown, message?: string | Error) {
    if (!Object.is(actual, expected)) {
      fail(message, `Expected values to be strictly equal:\n\n${inspect(actual)} !== ${inspect(expected)}`, actual, expected, 'strictEqual');
    }
  },
  notEqual(actual: unknown, expected: unknown, message?: string | Error) {
    if (Object.is(actual, expected)) {
      fail(message, `Expected "actual" to be strictly unequal to: ${inspect(expected)}`, actual, expected, 'notStrictEqual');
    }
  },
  deepEqual(actual: unknown, expected: unknown, message?: string | Error) {
    if (!isEqual(actual, expected)) {
      fail(message, `Expected values to be strictly deep-equal:\n+ actual - expected\n\n+ ${inspect(actual)}\n- ${inspect(expected)}`, actual, expected, 'deepStrictEqual');
    }
  },
  notDeepEqual(actual: unknown, expected: unknown, message?: string | Error) {
    if (isEqual(actual, expected)) {
      fail(message, `Expected "actual" not to be strictly deep-equal to: ${inspect(expected)}`, actual, expected, 'notDeepStrictEqual');
    }
  },
  match(actual: string, expected: RegExp, message?: string | Error) {
    if (!expected.test(actual)) {
      fail(message, `The input did not match the regular expression ${expected}. Input:\n\n${inspect(actual)}`, actual, expected, 'match');
    }
  },
  throws(block: () => unknown, expected?: unknown, message?: string | Error) {
    try {
      block();
    } catch (error) {
      if (!matches(error, expected)) {
        throw error;
      }
      return;
    }
    fail(message, 'Missing expected exception.', undefined, expected, 'throws');
  },
  async rejects(promiseOrBlock: Promise<unknown> | (() => Promise<unknown>), expected?: unknown, message?: string | Error) {
    try {
      await (typeof promiseOrBlock === 'function' ? promiseOrBlock() : promiseOrBlock);
    } catch (error) {
      if (!matches(error, expected)) {
        throw error;
      }
      return;
    }
    fail(message, 'Missing expected rejection.', undefined, expected, 'rejects');
  },
  doesNotThrow(block: () => unknown, message?: string | Error) {
    try {
      block();
    } catch (error) {
      fail(message, `Got unwanted exception.\nActual message: "${error instanceof Error ? error.message : String(error)}"`, error, undefined, 'doesNotThrow');
    }
  },
  fail(message: string | Error = 'Failed'): never {
    return fail(message, 'Failed');
  },
});

Object.assign(assert, { strictEqual: assert.equal, notStrictEqual: assert.notEqual, deepStrictEqual: assert.deepEqual, notDeepStrictEqual: assert.notDeepEqual, strict: assert });

export default assert;
