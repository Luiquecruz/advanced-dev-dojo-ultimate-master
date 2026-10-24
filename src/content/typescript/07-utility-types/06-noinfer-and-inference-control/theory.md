When a type parameter appears in several parameters, TypeScript collects an **inference candidate** from
each of them and combines them. Usually that is what you want, but sometimes one position should **only be
checked**, not used to infer.

```ts
function createLight<TColor extends string>(colors: readonly TColor[], initial: TColor) {
  /* ... */
}

createLight(['red', 'yellow', 'green'], 'blue');
// No error! TColor is inferred as 'red' | 'yellow' | 'green' | 'blue'
```

The typo `'blue'` became part of the union instead of being rejected. The intent was: "infer `TColor` from
`colors`, then check `initial` against it".

## Modern: `NoInfer<T>` (TypeScript 5.4)

Wrap the positions that must not contribute candidates:

```ts
function createLight<TColor extends string>(colors: readonly TColor[], initial: NoInfer<TColor>) {
  /* ... */
}

createLight(['red', 'yellow', 'green'], 'blue');
// error: Argument of type '"blue"' is not assignable to parameter of type '"red" | "yellow" | "green"'
```

`NoInfer<T>` is an intrinsic type: for checking it is exactly `T`, it only blocks inference through that
position. It works anywhere inside a parameter type: `fallback: NoInfer<T>`,
`handlers: Record<NoInfer<TEvent>, () => void>`, `options?: { default: NoInfer<T> }`.

## Legacy workarounds

Before 5.4, libraries used tricks that you will still find in older code:

```ts
// 1. A second type parameter constrained by the first
function createLight<TColor extends string, TInitial extends TColor>(colors: readonly TColor[], initial: TInitial) {}

// 2. Deferring inference with a conditional or an intersection
type NoInferLegacy<T> = [T][T extends any ? 0 : never];
function createLight2<TColor extends string>(colors: readonly TColor[], initial: NoInferLegacy<TColor>) {}
```

The extra type parameter leaks into the signature and error messages; the conditional trick relies on
inference implementation details. `NoInfer` states the intent directly.

## Other ways to control inference

- **Explicit type arguments**: `createLight<'red' | 'green'>(...)` skips inference entirely, at the cost of
  repetition (and every parameter without a default must be given).
- **`const` type parameters** keep literal types instead of widening them.
- **`satisfies`** checks a value against a type without changing the inferred type of the value.
- **Parameter order matters for callbacks**: context-sensitive arguments (unannotated callbacks) are
  inferred after the others, so data-first APIs (`map(items, fn)`) give the callback precise types.
- **Annotating the result variable** provides a return-type inference candidate:
  `const list: string[] = createList();`.

## Pitfalls

- `NoInfer` only matters when another position can infer the type parameter. If it is the *only* position,
  the parameter falls back to its constraint (or `unknown`).
- It does not narrow anything at runtime. If plain JavaScript callers can pass anything, keep the runtime
  validation.
- Reach for it when a typo silently widened a union in your API. If the API already rejects bad input, you do
  not need it.
