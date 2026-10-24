## Anything can be thrown

JavaScript lets you `throw` any value: an `Error`, a string, a number, even `undefined`. Libraries and old code really do throw strings and plain objects. TypeScript therefore cannot promise that a `catch` variable is an `Error`.

```ts
throw 'disk full';            // a string
throw { code: 'E_TIMEOUT' };  // a plain object
throw new Error('broken');    // the well-behaved case
```

## catch variables are unknown

Under `strict` (the default since TypeScript 6.0) the flag `useUnknownInCatchVariables` types every `catch` variable as `unknown`. You must narrow before touching it:

```ts
try {
  riskyOperation();
} catch (error) {
  // error: unknown
  console.log(error.message); // Error: 'error' is of type 'unknown'.

  if (error instanceof Error) {
    console.log(error.message); // OK: narrowed to Error
  }
}
```

The same applies to promise rejections: `.catch((reason) => ...)` receives `any` for historical reasons, so annotate it as `unknown` yourself.

### Legacy vs modern

Before TypeScript 4.4 catch variables were `any`, and many codebases still write `catch (error: any)` to silence the compiler. That compiles, but it reintroduces the bug the flag prevents: `error.message` is `undefined` when someone throws a string. Prefer narrowing, or a small helper:

```ts
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error';
}
```

## Custom error classes

Subclass `Error` to give failures a recognisable type that callers can check with `instanceof`:

```ts
class NotFoundError extends Error {
  override name = 'NotFoundError';

  constructor(readonly resource: string, options?: ErrorOptions) {
    super(`${resource} not found`, options);
  }
}
```

- `override` is required on `name` when `noImplicitOverride` is enabled, because `Error` already declares it.
- Setting `name` makes stack traces and `String(error)` readable.
- With an ES2015+ target, `instanceof` works on subclasses out of the box. The old `Object.setPrototypeOf(this, NotFoundError.prototype)` workaround was only needed when compiling to ES5, which TypeScript 6.0 deprecates.

## Keep the original error with cause

ES2022 added `cause` to the `Error` constructor through `ErrorOptions`. Wrap low-level errors in domain errors without losing the original stack:

```ts
try {
  JSON.parse(text);
} catch (error) {
  throw new NotFoundError('settings.json', { cause: error });
}
```

`cause` is typed `unknown`, so consumers narrow it the same way they narrow a `catch` variable.

## Detecting errors across realms

`instanceof Error` fails for errors created in another realm (an iframe, a `vm` context or a worker message). The ES2026 `Error.isError(value)` checks the internal slot instead and is a type predicate (`value is Error`). TypeScript ships its types in `lib.esnext`; check runtime support before relying on it.

## Pitfalls

- Never assume shape: an object with a `message` property is not necessarily an `Error`. Check `typeof value.message === 'string'` after narrowing with `typeof value === 'object' && value !== null && 'message' in value`.
- Do not swallow errors in an empty `catch {}`. If you really mean to ignore one, say so in a comment and keep the scope tiny.
- Optional catch binding (`catch { ... }`) is fine when you do not need the value at all.
