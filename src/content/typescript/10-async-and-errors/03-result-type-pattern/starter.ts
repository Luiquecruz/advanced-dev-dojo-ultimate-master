// TODO: replace this weak shape with { ok: true; value: T } | { ok: false; error: E }
type Result<T, E> = { ok: boolean; value?: T; error?: E };

type AgeError = 'empty' | 'not-a-number' | 'out-of-range';

function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

function parseAge(input: string): Result<number, AgeError> {
  // TODO: return err("empty"), err("not-a-number"), err("out-of-range") or ok(age)
  return err('empty');
}

function mapResult<T, U, E>(result: Result<T, E>, transform: (value: T) => U): Result<U, E> {
  // TODO: transform success values, pass errors through
  throw new Error('Not implemented');
}

function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T {
  // TODO: return the value on success, otherwise fallback
  return fallback;
}
