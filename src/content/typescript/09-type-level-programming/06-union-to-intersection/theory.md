Turning `A | B | C` into `A & B & C` is one of the most famous type-level tricks. It looks like magic, but
it follows from one rule about **variance** and how `infer` combines multiple candidates.

```ts
type UnionToIntersection<U> =
  (U extends unknown ? (arg: U) => void : never) extends (arg: infer I) => void ? I : never;

type R = UnionToIntersection<{ a: string } | { b: number }>;
// { a: string } & { b: number }
```

## Where is it useful?

- **Plugin systems**: each plugin contributes an object type; the merged API is the intersection of all of
  them.
- **Merging tuples of objects**: `mergeAll(a, b, c)` returns `A & B & C`.
- **Building overloads**: an intersection of function types is an overloaded function, so a union of
  handler signatures becomes one function that accepts every variant.

## Step 1: distribute into functions

The first half is a distributive conditional type that wraps every member in a function **parameter**:

```ts
type Step1 = { a: string } | { b: number } extends infer U
  ? U extends unknown ? (arg: U) => void : never
  : never;
// ((arg: { a: string }) => void) | ((arg: { b: number }) => void)
```

## Step 2: infer from a contravariant position

The second half matches that union of functions against a single function pattern `(arg: infer I) =>
void`. `I` now has **several candidates**, one per union member. How they are combined depends on the
position of `I`:

| Position of `infer` | Variance | Candidates are combined into |
| --- | --- | --- |
| return type, property, array element | covariant | a **union** |
| function parameter | contravariant | an **intersection** |

Why an intersection? A function that can stand in for **every** member of the union must accept an
argument that satisfies **all** of their parameter types at once. That is precisely `A & B`.

Swap the position and the trick stops working: inferring from `() => infer I` (covariant) gives back the
original union. This is the classic bug when writing the helper from memory.

## Overloads for free

Intersections of function types behave like overload lists, so the helper turns a union of signatures into
one callable type:

```ts
type Handler = UnionToIntersection<((v: string) => string) | ((v: number) => number)>;
declare const handle: Handler;
handle('a'); // string
handle(1);   // number
```

## Merging tuples of objects

`T[number]` turns a tuple into a union; `UnionToIntersection` turns it into an intersection; `Simplify`
flattens it for readable tooltips and strict equality:

```ts
type Simplify<T> = { [K in keyof T]: T[K] } & {};
type Merge<T extends readonly object[]> = Simplify<UnionToIntersection<T[number]>>;

type M = Merge<[{ a: 1 }, { b: 2 }]>; // { a: 1; b: 2 }
```

## Pitfalls

- **Primitives collapse**: `'a' & 'b'` and `string & number` are `never`. Even `boolean` (which is
  `true | false`) becomes `never`. The helper is meant for object and function types.
- **Conflicting properties**: merging `{ id: string }` with `{ id: number }` gives a property of type
  `never`, not an error. Validate inputs if conflicts are possible.
- **Order is not guaranteed** inside unions, so tricks built on top of this one (such as "last member of a
  union" or `UnionToTuple`) depend on compiler internals and can change between versions. Avoid them in
  production types.
- `UnionToIntersection<never>` is `unknown`: with no candidates, the inferred type falls back to its
  constraint.
