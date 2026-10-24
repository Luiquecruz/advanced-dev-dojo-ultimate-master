Sometimes the source of truth is a **function**, not a type: a library exposes `createClient()` but not the
type of the client it returns, or your own `fetchUser()` returns an inferred object you never named. A set
of utility types extracts types **from functions and classes**.

```ts
async function fetchUser(id: number, options: { includePosts: boolean }) {
  return { id, name: 'Ada', posts: options.includePosts ? ['Hello'] : [] };
}
```

## `ReturnType<F>` and `Parameters<F>`

They take a **function type**, so pass `typeof fn`:

```ts
type FetchResult = ReturnType<typeof fetchUser>;
// Promise<{ id: number; name: string; posts: string[] }>

type FetchArgs = Parameters<typeof fetchUser>;
// [id: number, options: { includePosts: boolean }]

type FetchOptions = Parameters<typeof fetchUser>[1];
// { includePosts: boolean }

type Wrong = ReturnType<fetchUser>;
// error: 'fetchUser' refers to a value, but is being used as a type here
```

`Parameters` returns a **labeled tuple**, so you can index it (`[1]`) or spread it in another signature:
`function logged(...args: Parameters<typeof fetchUser>) { ... }`.

## `Awaited<T>`: unwrap promises

```ts
type User = Awaited<ReturnType<typeof fetchUser>>;
// { id: number; name: string; posts: string[] }

type Deep = Awaited<Promise<Promise<number>>>; // number: unwraps recursively
type Plain = Awaited<string>;                  // string: non-promises pass through
```

`Awaited` (TS 4.5) models exactly what `await` does, including nested promises and any "thenable" object.
Before it existed, code used hand-written helpers like
`type Unwrap<T> = T extends Promise<infer U> ? U : T`, which did not unwrap recursively. `Promise.all` and
`async` functions are now typed with `Awaited` internally.

## Classes: `ConstructorParameters` and `InstanceType`

```ts
class HttpClient {
  constructor(readonly baseUrl: string, readonly timeoutMs = 5000) {}
}

type ClientArgs = ConstructorParameters<typeof HttpClient>; // [baseUrl: string, timeoutMs?: number]
type Client = InstanceType<typeof HttpClient>;              // HttpClient
```

`InstanceType` is useful when you only have the constructor, for example a factory that receives a class:
`function create<C extends new (...args: any[]) => unknown>(Ctor: C): InstanceType<C>`.

## When to derive types this way

- Types of **third-party** values that the library does not export.
- Keeping wrappers in sync: a `retry(fetchUser)` wrapper whose parameters must always match the original.
- Inferred return types of factories (`createStore`, `createSlice`) that would be painful to write by hand.

For your own domain types, it is often clearer to declare the type first and annotate the function with it.
Deriving everything from implementations can make types hard to read and couples them to function bodies.

## Pitfalls

- **Overloads:** `ReturnType` and `Parameters` use the **last** overload signature only.
- **Generic functions:** type parameters are replaced by their constraints (often `unknown`), so
  `ReturnType<typeof identity>` is `unknown`. Use an instantiation expression first:
  `ReturnType<typeof identity<string>>` (TS 4.7+).
- `Parameters<F>` requires a function type: `Parameters<string>` is an error, and `Parameters<any>` is
  `unknown[]`.
