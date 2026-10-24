A **conditional type** chooses between two types based on an assignability check. It is the type-level
version of the ternary operator:

```ts
type IsString<T> = T extends string ? true : false;

type A = IsString<'hello'>; // true
type B = IsString<42>;      // false
```

Read `T extends string ? X : Y` as: *"if `T` is assignable to `string`, the result is `X`, otherwise `Y`"*.
`extends` here does **not** mean inheritance and does **not** mean equality. It is the same assignability
rule the compiler uses when you pass an argument to a parameter: `'hello'` is assignable to `string`, so
the check succeeds.

## Why they exist

Generic code often needs the output type to depend on the input type. Without conditional types the only
option was overloads, which do not compose. With them you can write reusable type functions:

```ts
type ElementOf<T> = T extends readonly unknown[] ? T[number] : T;

type A = ElementOf<string[]>;          // string
type B = ElementOf<readonly [1, 2]>;   // 1 | 2
type C = ElementOf<boolean>;           // boolean
```

Many built-in utility types are conditional types. `NonNullable<T>` used to be declared as
`T extends null | undefined ? never : T` (modern versions use `T & {}`), and `Exclude`, `Extract`,
`ReturnType` and `Awaited` are all conditional types under the hood.

## Chaining conditions

Conditional types nest naturally, just like `else if` chains. The first matching branch wins, so order
the checks from most specific to most general:

```ts
type Kind<T> =
  T extends string ? 'text' :
  T extends number | bigint ? 'numeric' :
  T extends (...args: never[]) => unknown ? 'callable' :
  'other';

type K1 = Kind<10n>;         // 'numeric'
type K2 = Kind<() => void>;  // 'callable'
```

## Deferred evaluation

When the checked type is still a **generic** type parameter, the compiler cannot decide the branch yet, so
the conditional stays *deferred* until the parameter is known:

```ts
function label<T>(value: T): Kind<T> {
  // Kind<T> is unresolved here: TypeScript does not know T yet
}
```

This is why implementing a function whose return type is a conditional type usually needs an assertion
(`as Kind<T>`) in the body: the compiler does not narrow `T` from runtime checks like `typeof value`. The
assertion is acceptable here because the conditional type *documents* the contract for callers, who get a
precise result type at every call site.

## Constraints on the parameters

You can constrain the inputs just like any generic: `type If<C extends boolean, T, F> = ...` rejects
`If<'yes', 1, 2>` at compile time. Use constraints to give users of your type helper early, readable errors.

## Pitfalls

- **`any` takes both branches**: `IsString<any>` is `boolean` (`true | false`), because `any` is both
  assignable and not assignable.
- **Unions are split** when the checked type is a naked type parameter: `IsString<'a' | 1>` is `boolean`.
  This *distribution* has its own lesson later in this module.
- **Assignability, not equality**: `'a' extends string` is true, so `T extends string` does not tell you
  that `T` *is* `string`. Use `[T] extends [string] ? ... ` plus the reverse check when you need equality.
- Prefer **readable names** for each branch and keep nesting shallow; a 10-level chain is usually a sign
  that a lookup type (`Record<Key, Result>`) would be clearer.
