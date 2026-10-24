At the type level, **tuples are lists**. They have a known length, ordered element types and a rich
syntax for slicing and joining them. Most type-level algorithms (counting, reversing, iterating) are
written with tuples.

## Reading from a tuple

```ts
type Point = [x: number, y: number, label: string];

type Second = Point[1];        // number
type Elements = Point[number]; // number | string  (union of all elements)
type Size = Point['length'];   // 3  (a number literal, not number!)
```

For a regular array `string[]`, `['length']` is just `number`; only tuples have literal lengths. That
difference is how type-level code tells tuples and arrays apart.

## Readonly tuples and `as const`

Values created with `as const` (or inferred through a `const` type parameter) are **readonly** tuples.
`readonly [1, 2]` is **not** assignable to `unknown[]`, so utilities should accept the wider constraint:

```ts
type Length<T extends readonly unknown[]> = T['length'];

const sizes = ['sm', 'md', 'lg'] as const;
type SizeCount = Length<typeof sizes>; // 3
```

## Variadic tuple types

TypeScript 4.0 introduced spreads inside tuple types. They let you build new tuples from old ones:

```ts
type Push<T extends readonly unknown[], V> = [...T, V];
type Concat<A extends readonly unknown[], B extends readonly unknown[]> = [...A, ...B];

type P = Push<[1, 2], 3>;          // [1, 2, 3]
type C = Concat<['a'], ['b', 'c']>; // ['a', 'b', 'c']
```

## Destructuring with infer

Spreads also work in patterns, so you can split a tuple into head and tail, or init and last, the same way
you would destructure an array:

```ts
type Head<T extends readonly unknown[]> = T extends readonly [infer H, ...unknown[]] ? H : never;
type Tail<T extends readonly unknown[]> = T extends readonly [unknown, ...infer R] ? R : [];

type H = Head<['a', 'b', 'c']>; // 'a'
type R = Tail<['a', 'b', 'c']>; // ['b', 'c']
```

The `readonly` in the pattern is important: a readonly tuple does not match a mutable pattern, while a
mutable tuple does match a readonly one.

A rest element can appear **anywhere**, not just at the end, so `[...infer Init, infer Last]` matches the
last element directly.

## Iterating with recursion

Combining head/tail destructuring with recursion gives you loops over tuples (`Equal` is the strict
equality helper used by this platform's type tests):

```ts
type Includes<T extends readonly unknown[], V> =
  T extends readonly [infer H, ...infer R]
    ? (Equal<H, V> extends true ? true : Includes<R, V>)
    : false;
```

## Counting with tuples

Because `length` is a literal, tuples double as **counters**: to compute `N + 1`, build a tuple of length
`N`, push one element and read `length` back. Type-level arithmetic libraries are built on this trick.

```ts
type Increment<N extends number, Acc extends unknown[] = []> =
  Acc['length'] extends N ? [...Acc, unknown]['length'] : Increment<N, [...Acc, unknown]>;

type Four = Increment<3>; // 4
```

## Pitfalls

- `[][0]` is a compile error ("tuple type '[]' of length '0' has no element at index '0'"), and on a
  generic `T` the index access does not tell you whether the tuple was empty. Use `infer` patterns when
  empty tuples need a specific answer such as `never`.
- `T[number]` on an empty tuple is `never`, which is usually what you want for `TupleToUnion`.
- Labeled elements (`[x: number]`) only affect editor hints; `Equal<[x: number], [number]>` is `true`.
