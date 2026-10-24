Conditional types can do more than answer yes or no. With the `infer` keyword they can **extract** a
piece of a type while checking it. `infer X` declares a new type variable that the compiler fills in by
matching the checked type against a pattern:

```ts
type ElementType<T> = T extends Array<infer Item> ? Item : never;

type A = ElementType<string[]>;       // string
type B = ElementType<Array<boolean>>; // boolean
type C = ElementType<number>;         // never (pattern did not match)
```

Think of the `extends` clause as a **pattern** with holes. If the pattern matches, every `infer` hole holds
the part of the type it lined up with and is available in the **true** branch only.

## Rebuilding the built-in helpers

Several standard utility types are a single `infer` away:

```ts
type MyReturnType<F> = F extends (...args: never[]) => infer R ? R : never;
type MyParameters<F> = F extends (...args: infer P) => unknown ? P : never;
type MyAwaited1<T> = T extends Promise<infer V> ? V : T;

type R = MyReturnType<() => Date>;             // Date
type P = MyParameters<(id: number, q?: string) => void>; // [id: number, q?: string]
```

The parameter list comes out as a **labeled tuple**, so optional and rest parameters survive the round trip.

## Holes anywhere in the pattern

`infer` works in any position: tuple elements, object properties, generic arguments, constructor
signatures and even template literal strings:

```ts
type Head<T> = T extends [infer H, ...unknown[]] ? H : never;
type IdOf<T> = T extends { id: infer I } ? I : never;
type Instance<C> = C extends abstract new (...args: never[]) => infer I ? I : never;
type Scheme<U> = U extends `${infer S}://${string}` ? S : never;

type S = Scheme<'https://example.com'>; // 'https'
```

## Constraining an inferred type (`infer X extends C`)

Since TypeScript 4.7 an inferred variable can carry its own constraint. The match only succeeds when the
inferred part satisfies it, and inside template literal types this also **converts** strings into literal
number or boolean types:

```ts
type ToNumber<S> = S extends `${infer N extends number}` ? N : never;

type N = ToNumber<'42'>;  // 42
type X = ToNumber<'abc'>; // never
```

Before 4.7 you had to nest a second conditional type (`S extends `${infer N}` ? N extends ... : never`)
and could not produce numeric literals from strings at all.

## Pitfalls

- **`infer` only lives in the true branch.** Referencing the variable in the false branch is an error.
- **Overloads**: inferring from an overloaded function uses only the **last** signature. `ReturnType` of an
  overloaded function can therefore surprise you.
- **Multiple candidates**: when the same `infer X` appears in several covariant positions the candidates are
  combined into a **union**; in contravariant positions (function parameters) they combine into an
  **intersection**. The last lesson of the next module uses that trick on purpose.
- Use `never[]` (or `any[]` in library code) for "any parameter list" patterns. With `unknown[]`, a function
  like `(id: number) => void` does **not** match, because parameters are checked contravariantly.
