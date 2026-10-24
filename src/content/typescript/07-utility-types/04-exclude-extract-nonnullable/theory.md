`Pick` and `Omit` work on the **keys of an object**. `Exclude`, `Extract` and `NonNullable` work on the
**members of a union**.

```ts
type Exclude<T, U> = T extends U ? never : T;
type Extract<T, U> = T extends U ? T : never;
type NonNullable<T> = T & {};
```

The first two are **distributive conditional types**: the condition is applied to each union member
separately, and members that become `never` disappear. You will write such types yourself later; for now,
think of them as filters.

## `Exclude<T, U>`: remove members

```ts
type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';
type SafeMethod = Exclude<Method, 'POST' | 'PUT' | 'DELETE'>;   // 'GET'
type Primitive = Exclude<string | number | (() => void), Function>; // string | number
```

## `Extract<T, U>`: keep members

```ts
type Writing = Extract<Method, 'POST' | 'PUT' | 'PATCH'>;  // 'POST' | 'PUT'
```

`U` does not need to be a member itself: anything **assignable** to `U` is kept. That makes `Extract`
perfect for selecting variants of a discriminated union by shape:

```ts
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; size: number }
  | { kind: 'triangle'; base: number; height: number };

type Circle = Extract<Shape, { kind: 'circle' }>;          // { kind: 'circle'; radius: number }
type NotCircle = Exclude<Shape, { kind: 'circle' }>;       // square | triangle
type Kind = Shape['kind'];                                 // 'circle' | 'square' | 'triangle'
```

## `NonNullable<T>`: remove `null` and `undefined`

```ts
type MaybeName = string | null | undefined;
type Name = NonNullable<MaybeName>; // string
```

Since TypeScript 4.8 it is defined as `T & {}`: intersecting with `{}` (any non-nullish value) removes `null`
and `undefined` while keeping everything else.

## Filtering arrays: legacy vs modern

`Array.prototype.filter` only narrows the element type when its callback is a **type predicate**. Before
TypeScript 5.5 you had to write the predicate yourself:

```ts
const values = ['a', null, 'b', undefined];

// legacy: explicit predicate
const names = values.filter((value): value is NonNullable<typeof value> => value != null); // string[]
```

TypeScript 5.5 added **inferred type predicates**: a simple arrow function like `(value) => value !== null`
is now recognized as a predicate automatically.

```ts
// modern: inferred predicate
const names = values.filter((value) => value != null); // string[]
```

Inference only works when the function body is a single narrowing expression whose `false` branch also
means "not that type". For anything more complex, or in generic code, write the predicate explicitly.

## Pitfalls

- `Exclude` and `Extract` do not check that `U` overlaps `T`. `Exclude<Method, 'PATCH'>` silently returns
  `Method` unchanged. A typo in a string literal fails silently too.
- They filter **union members**, not object properties. `Exclude<User, 'password'>` does nothing useful;
  that job belongs to `Omit`.
- A non-union `T` is a single member: `Extract<string, 'a'>` is `never`, because `string` is not assignable
  to `'a'`.
