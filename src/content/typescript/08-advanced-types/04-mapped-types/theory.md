A **mapped type** builds a new object type by iterating over a union of keys, the way `Array.map` builds a
new array by iterating over elements:

```ts
type Flags<Keys extends string> = { [K in Keys]: boolean };

type Features = Flags<'darkMode' | 'beta'>;
// { darkMode: boolean; beta: boolean }
```

`K in Keys` is the loop: `K` takes each member of `Keys` in turn and the right-hand side computes the
property type for that key.

## Transforming an existing type

The most common source of keys is `keyof T`. Combined with an indexed access `T[K]` you can copy a type
and transform every property:

```ts
type Stringify<T> = { [K in keyof T]: string };
type Async<T> = { [K in keyof T]: Promise<T[K]> };

type User = { id: number; name: string };
type UserForm = Stringify<User>; // { id: string; name: string }
```

A mapped type of the form `{ [K in keyof T]: ... }` is called **homomorphic**: it follows the structure of
`T`. Homomorphic mapped types have three superpowers:

1. They **preserve modifiers**: `readonly` and `?` on the original properties are kept.
2. They **preserve arrays and tuples**: mapping over `readonly string[]` produces an array, not an object
   with `length`, `push` and every other array method as properties.
3. They **pass primitives through**: `Stringify<number>` is just `number`.

## Adding and removing modifiers

Inside the brackets you can add (`+`, the default) or remove (`-`) the `readonly` and `?` modifiers:

```ts
type MyPartial<T>  = { [K in keyof T]?: T[K] };
type MyRequired<T> = { [K in keyof T]-?: T[K] };
type MyReadonly<T> = { readonly [K in keyof T]: T[K] };
type Mutable<T>    = { -readonly [K in keyof T]: T[K] };
```

These four lines are, almost literally, how `Partial`, `Required` and `Readonly` are declared in
`lib.es5.d.ts`. There is no built-in `Mutable`, which makes it a classic helper to write yourself.

`-?` also strips the `undefined` that optionality added: `MyRequired<{ a?: string }>` is `{ a: string }`.

## Mapping with a lookup

The value side can be any type expression, including conditional types, which makes mapped types very
expressive:

```ts
type Validators<T> = {
  [K in keyof T]: (value: T[K]) => string | null;
};

const userValidators: Validators<User> = {
  id: (value) => (value > 0 ? null : 'Invalid id'),
  name: (value) => (value.trim() ? null : 'Required'),
};
```

Each callback receives the right parameter type without a single annotation.

## Legacy vs modern

Before mapped types existed (TypeScript 2.1), every "partial version" or "readonly version" of a type had to
be written by hand and kept in sync manually. Today the standard library ships `Partial`, `Required`,
`Readonly`, `Pick` and `Record`, all implemented as mapped types.

## Pitfalls

- `{ [K in keyof T]: ... }` is homomorphic, but `{ [K in Keys]: ... }` with an unrelated key union is not,
  so it does not keep modifiers.
- Mapping over a **class instance type** keeps only public members; private and `#private` members
  disappear.
- Mapped types are **shallow**. Nested objects keep their original modifiers; making them deep requires
  recursion, covered in the next module.
