type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

type AgeError = 'empty' | 'not-a-number' | 'out-of-range';

function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

function parseAge(input: string): Result<number, AgeError> {
  const trimmed = input.trim();
  if (trimmed === '') {
    return err('empty');
  }
  const age = Number(trimmed);
  if (!Number.isInteger(age)) {
    return err('not-a-number');
  }
  if (age < 0 || age > 150) {
    return err('out-of-range');
  }
  return ok(age);
}

function mapResult<T, U, E>(result: Result<T, E>, transform: (value: T) => U): Result<U, E> {
  return result.ok ? ok(transform(result.value)) : result;
}

function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T {
  return result.ok ? result.value : fallback;
}
