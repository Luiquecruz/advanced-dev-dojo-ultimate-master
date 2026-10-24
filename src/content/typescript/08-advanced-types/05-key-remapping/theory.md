Plain mapped types keep the keys they iterate over. Since TypeScript 4.1, an **`as` clause** lets a mapped
type **rename** or **drop** keys while it maps them:

```ts
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

type User = { name: string; age: number };
type UserGetters = Getters<User>;
// { getName: () => string; getAge: () => number }
```

`K` is still the original key, so the value side can keep reading `T[K]`. Only the **name** of the output
property comes from the expression after `as`.

## Renaming keys

The `as` expression can be any type that produces a string, number or symbol literal. Template literal
types and the intrinsic string helpers (`Capitalize`, `Uncapitalize`, `Uppercase`, `Lowercase`) are the
usual tools:

```ts
type Prefixed<T, P extends string> = { [K in keyof T as `${P}${string & K}`]: T[K] };

type Env = Prefixed<{ port: number; host: string }, 'APP_'>;
// { APP_port: number; APP_host: string }
```

Why `string & K`? `keyof T` can contain `number` and `symbol` keys, and template literal types only accept
`string | number | bigint | boolean | null | undefined`. Intersecting with `string` keeps the string keys
and drops symbols. `Extract<K, string>` works too.

## Filtering keys

When the `as` clause resolves to `never`, the property is **removed**. Combined with a conditional type,
this filters properties by their value type:

```ts
type MethodsOf<T> = {
  [K in keyof T as T[K] extends (...args: never[]) => unknown ? K : never]: T[K];
};

type Counter = { count: number; increment(): void; reset(): void };
type CounterMethods = MethodsOf<Counter>;
// { increment(): void; reset(): void }
```

You can also filter by key: `{ [K in keyof T as Exclude<K, 'password'>]: T[K] }` is a home-made `Omit`.
Unlike the built-in `Omit`, it stays **homomorphic**, so it distributes over unions: `Omit<A | B, 'id'>`
only keeps the keys common to every member, while the `as` version keeps each variant intact.

## Legacy vs modern

Before 4.1 filtering needed two steps: compute the matching keys with a lookup, then `Pick` them:

```ts
type MethodKeys<T> = {
  [K in keyof T]: T[K] extends Function ? K : never;
}[keyof T];
type LegacyMethodsOf<T> = Pick<T, MethodKeys<T>>;
```

The pattern still appears in older code bases and libraries. The `as` clause expresses the same idea in a
single mapped type, and renaming keys was simply impossible before it.

## Mapping over any union

With `as`, the iteration variable does not have to be a key at all. You can iterate over a union of
**objects** and derive the key from each member, which is perfect for discriminated unions:

```ts
type Action =
  | { type: 'add'; amount: number }
  | { type: 'reset' };

type Reducers = { [A in Action as A['type']]: (action: A) => void };
// { add: (action: { type: 'add'; amount: number }) => void; reset: (action: { type: 'reset' }) => void }
```

Each handler receives the exact variant for its key, with no manual `Extract`.

## Pitfalls

- Two keys mapped to the **same** name are merged into one property whose type is the union of both values.
- `Capitalize<K>` fails when `K` may be a `symbol`; always narrow with `string & K` first.
- Filtering with `as` keeps modifiers only when you iterate over `keyof T`; iterating over another union
  starts from scratch.
