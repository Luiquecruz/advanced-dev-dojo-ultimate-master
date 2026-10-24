A function that works with "any kind of value" has a typing problem. With `any` or `unknown`, the caller
loses information:

```ts
function firstAny(items: any[]): any {
  return items[0];
}
const name = firstAny(['Ada', 'Alan']); // any: typos are no longer caught
name.toUpperCse();                      // compiles, crashes at runtime

function firstUnknown(items: unknown[]): unknown {
  return items[0];
}
const other = firstUnknown(['Ada']);    // unknown: safe, but useless without narrowing
```

**Generics** fix this with a **type parameter**: a placeholder for a type chosen at each call.

```ts
function first<T>(items: readonly T[]): T | undefined {
  return items[0];
}

const user = first(['Ada', 'Alan']);   // T = string → string | undefined
const count = first([1, 2, 3]);        // T = number → number | undefined
```

## Inference and explicit type arguments

Most of the time TypeScript **infers** `T` from the arguments. You can still pass it explicitly when
inference has nothing to work with, or to force a wider type:

```ts
const empty = first<string>([]);              // string | undefined
const mixed = first<string | number>(['a']);  // string | number | undefined
```

## Several type parameters

Type parameters can relate inputs to outputs and to each other:

```ts
function mapArray<TInput, TOutput>(items: readonly TInput[], transform: (item: TInput) => TOutput): TOutput[] {
  return items.map(transform);
}

const lengths = mapArray(['a', 'abc'], (word) => word.length); // number[]
```

`word` is typed as `string` without annotation: TypeScript first infers `TInput` from the array, then uses
it to type the callback, and finally infers `TOutput` from the callback's return.

## Generic arrow functions and function types

```ts
const identity = <T,>(value: T): T => value;  // the trailing comma avoids JSX ambiguity in .tsx files
type Mapper = <T, U>(value: T, fn: (value: T) => U) => U;
```

## Naming

Single letters (`T`, `U`, `K`, `V`) are traditional. Descriptive names (`TItem`, `TResult`) read better as
soon as there is more than one parameter.

## Pitfalls

- **A type parameter should appear at least twice.** `function log<T>(value: T): void` gains nothing over
  `value: unknown`. Generics are about *relating* types, for example an input to an output.
- **Do not return `T` when you create a new value.** `function make<T>(): T { return {} as T; }` lies: the
  caller picks `T`, you cannot produce it.
- Arrays can be empty. Indexing returns `T` by default, so be honest and return `T | undefined` (or enable
  `noUncheckedIndexedAccess`).
- Prefer generics to overloads when every overload would have the same shape for different types.
