## `null` and `undefined` under `strictNullChecks`

JavaScript has two "nothing" values: `undefined` (missing, not initialized) and `null` (intentionally empty). With **`strictNullChecks`** (part of `strict`) they are separate types and are **not** assignable to other types:

```ts
let title: string = 'Draft';
title = null;        // Error: Type 'null' is not assignable to type 'string'

let subtitle: string | null = null; // opt in explicitly
```

Without `strictNullChecks` (the legacy default before `strict`), `null` and `undefined` fit into every type, and `subtitle.length` compiles even when it crashes at runtime. Always keep it on.

APIs tell you when a value may be missing through their return types. `Array.prototype.find` returns `T | undefined`, `Map.prototype.get` returns `V | undefined`, and you must handle the empty case before using the value.

## Handling optional values

```ts
interface User { name: string; nickname?: string }

function label(user: User | undefined): string {
  return user?.nickname ?? user?.name ?? 'Guest';
}
```

- **Optional chaining `?.`** stops and returns `undefined` when the left side is `null` or `undefined`.
- **Nullish coalescing `??`** falls back only for `null` / `undefined`.
- **`||`** falls back for every *falsy* value, including `0`, `''` and `false`. That is a classic bug:

```ts
const retries = settings.retries || 3; // 0 retries becomes 3!
const fixed = settings.retries ?? 3;   // 0 stays 0
```

- **Non-null assertion `!`** (`user!.name`) tells the compiler "trust me, it is not null". It is erased at runtime, so if you are wrong you get the very crash `strictNullChecks` was meant to prevent. Prefer a real check.

An optional property `nickname?: string` has type `string | undefined` when read. The `exactOptionalPropertyTypes` option additionally distinguishes "missing" from "explicitly set to `undefined`".

## `void`

`void` is the return type of functions whose return value should be **ignored**:

```ts
function logEvent(message: string): void {
  console.log(message);
}
```

A function *type* returning `void` still accepts callbacks that return something. This is intentional, so that `items.forEach((item) => list.push(item))` compiles even though `push` returns a number:

```ts
type Listener = () => void;
const listener: Listener = () => 42; // allowed, the result is simply ignored
```

## `never`

`never` is the type with **no values**. It appears in two places:

1. **Functions that never return** because they always throw or loop forever.
2. **Impossible states**, e.g. after every member of a union has been handled (the narrowing module builds exhaustiveness checks on this).

```ts
function fail(message: string): never {
  throw new Error(message);
}

const port = config.port ?? fail('port is required'); // port: number, never adds nothing
```

Because `never` is assignable to every type, a call to `fail` fits in any expression, and code after it is known to be unreachable.

Pitfall: a function **declaration** that only throws is inferred as returning `void`, not `never`. Annotate `: never` explicitly when you want callers to benefit from it. (Arrow functions and function expressions do infer `never`.)

## Summary

| Type | Values | Typical use |
| --- | --- | --- |
| `undefined` | `undefined` | missing values, optional properties |
| `null` | `null` | intentional "no value" |
| `void` | (ignored) | return type of side-effect functions |
| `never` | none | functions that throw, impossible branches |
