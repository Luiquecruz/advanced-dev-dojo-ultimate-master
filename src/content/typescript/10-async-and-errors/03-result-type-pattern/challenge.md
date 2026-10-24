Replace the weak `Result` shape with a real discriminated union and build a parser that never throws.

1. Define `Result<T, E>` as `{ ok: true; value: T } | { ok: false; error: E }`.
2. Keep `ok<T>(value: T): Result<T, never>` and `err<E>(error: E): Result<never, E>` working.
3. Implement `parseAge(input: string): Result<number, AgeError>` (`AgeError` is `"empty" | "not-a-number" | "out-of-range"`):
   - input that is empty after trimming → `err("empty")`
   - text that is not an integer (e.g. `"abc"`, `"12.5"`) → `err("not-a-number")`
   - integers below `0` or above `150` → `err("out-of-range")`
   - otherwise → `ok(age)`
4. Implement `mapResult<T, U, E>(result, transform)`: applies `transform` to a success value, returns errors unchanged without calling `transform`.
5. Implement `unwrapOr<T, E>(result, fallback)`: the value on success, `fallback` on failure.

`parseAge` must not use `throw`.
