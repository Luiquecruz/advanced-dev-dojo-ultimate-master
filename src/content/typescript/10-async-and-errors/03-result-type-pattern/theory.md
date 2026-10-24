## Exceptions are invisible in signatures

A function's type says nothing about what it throws. `parseDate(text: string): Date` might throw on bad input, on an unsupported locale or never. Callers cannot tell, the compiler cannot help, and forgotten `try`/`catch` blocks surface as crashes. TypeScript has no checked exceptions (unlike Java's `throws` clause) and no plans to add them.

The **Result pattern**, popular in Rust (`Result<T, E>`), Go (`value, err`) and functional languages, moves expected failures into the **return type**:

```ts
type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };
```

It is a plain discriminated union. The `ok` literal is the discriminant, so checking it narrows the whole object:

```ts
const result = divide(10, 0);

if (result.ok) {
  result.value; // number
} else {
  result.error; // 'division-by-zero'
}

result.value; // Error: Property 'value' does not exist on type '{ ok: false; error: ... }'
```

The caller **cannot** read the value without first handling the error. That is the whole point.

## Constructors with never

Two tiny helpers make results pleasant to create. `never` is the empty type, and `Result<T, never>` is assignable to `Result<T, E>` for any `E`, so `ok(1)` fits wherever a `Result<number, SomeError>` is expected:

```ts
function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
```

## Typed error values

Because errors are ordinary values, you choose their shape. String literal unions are the lightest option and make exhaustive handling easy:

```ts
type SignupError = 'email-taken' | 'weak-password';

function messageFor(error: SignupError): string {
  switch (error) {
    case 'email-taken': return 'That email is already registered.';
    case 'weak-password': return 'Use at least 12 characters.';
  }
}
```

For richer data use discriminated objects: `{ type: 'rate-limited'; retryAfter: number }`.

## Transforming results

Helpers such as `map` change the success value and pass errors through untouched, so you can compose steps without nested `if`s:

```ts
function map<T, U, E>(result: Result<T, E>, transform: (value: T) => U): Result<U, E> {
  return result.ok ? ok(transform(result.value)) : result;
}
```

Notice `: result` in the error branch: after narrowing, `result` is `{ ok: false; error: E }`, which is assignable to `Result<U, E>` whatever `U` is.

## Async results

A `Promise<Result<T, E>>` should never reject for expected failures. Reserve rejection (and `throw`) for real bugs and infrastructure failures you cannot handle locally.

## Exceptions vs results

| | Exceptions | Result values |
| --- | --- | --- |
| Visible in the type | no | yes |
| Forces handling | no | yes, to reach the value |
| Cost of propagation | free (bubbles up) | explicit at each step |
| Best for | bugs, unrecoverable failures | expected, recoverable failures (validation, not found) |

Libraries such as `neverthrow` and `Effect` build full toolkits around this idea, but the core is just the union above.

## Pitfalls

- Using `ok: boolean` instead of the literals `true` and `false` breaks narrowing: TypeScript can no longer tell the members apart.
- Making both `value?` and `error?` optional on one object type compiles, but forces `undefined` checks everywhere.
- Do not wrap everything. Programming errors (a `null` that should never happen) are still best thrown.
