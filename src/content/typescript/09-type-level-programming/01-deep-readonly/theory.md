The built-in `Readonly<T>` is **shallow**: it marks the top-level properties as `readonly` but leaves
nested objects and arrays fully mutable.

```ts
type Config = { server: { port: number }; tags: string[] };

const config: Readonly<Config> = { server: { port: 80 }, tags: [] };
config.server = { port: 81 }; // error, good
config.server.port = 81;      // compiles!
config.tags.push('oops');     // compiles!
```

Immutable state (Redux, signals, React props), configuration objects and frozen constants all need a
**deep** version. Building it is a rite of passage in type-level programming because it combines
everything from the previous module: conditional types, mapped types and recursion.

## First attempt

```ts
type DeepReadonly<T> = { readonly [K in keyof T]: DeepReadonly<T[K]> };
```

This already works surprisingly well, thanks to homomorphic mapped types:

- **Primitives pass through**: `DeepReadonly<number>` is `number`, so the recursion stops at leaves.
- **Arrays and tuples stay arrays**: mapping over `string[]` produces `readonly string[]`, and over a
  tuple produces a readonly tuple, with each element transformed recursively.

## The function problem

Functions are objects too. Mapping over a function type keeps only its properties and **drops the call
signature**, so a callback stops being callable:

```ts
type Broken = DeepReadonly<{ onSave: (id: number) => void }>;
// { readonly onSave: {} }, onSave() is now an error
```

The fix is to stop the recursion at functions with a conditional type:

```ts
type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : { readonly [K in keyof T]: DeepReadonly<T[K]> };
```

## Built-in classes

The same issue affects instances like `Date`, `Map` or `Set`: mapping over them produces plain objects
with all their methods marked readonly, which breaks `instanceof`-style assignability. Production-grade
libraries (`type-fest`, `ts-essentials`) add extra branches such as `T extends Map<infer K, infer V> ?
ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>> : ...`. Decide how far you need to go; for JSON-like state,
functions and arrays are usually enough.

## The deep family

Once you have one deep helper, the others follow the same skeleton. Only the modifier changes:

```ts
type DeepMutable<T> = T extends (...args: never[]) => unknown
  ? T
  : { -readonly [K in keyof T]: DeepMutable<T[K]> };
```

`DeepPartial` is trickier: adding `?` to array elements produces `(T | undefined)[]`, which is rarely what
you want, so it usually treats arrays as leaves. That means a chain of checks before the mapped type:
functions first, then arrays, then objects, and finally primitives as the fallback. The order matters
because arrays and functions are also assignable to `object`.

## Matching the runtime

Types do not freeze anything at runtime. `Object.freeze` is shallow too, and its declaration in
`lib.es5.d.ts` returns `Readonly<T>`. A `deepFreeze` helper walks the value recursively and returns it
typed as `DeepReadonly<T>`; the assertion is unavoidable because the compiler cannot follow the recursion
through runtime code.

## Pitfalls

- Recursing into a type with **cycles** (an object that references itself through its type) is fine:
  mapped types are evaluated lazily, property by property.
- `DeepReadonly<unknown>` becomes `{}`: mapping over `unknown` has no keys to keep. Guard with
  `unknown extends T ? T : ...` if your data can contain `unknown` fields.
- Equality checks such as `Equal<DeepReadonly<X>, Expected>` are strict: a function type that went through
  the mapped type branch instead of the function branch will fail the comparison.
