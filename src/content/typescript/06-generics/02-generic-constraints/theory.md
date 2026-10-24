An unconstrained type parameter can be **anything**, so the function body may only do what is valid for
every type:

```ts
function longest<T>(a: T, b: T): T {
  return a.length >= b.length ? a : b; // error: Property 'length' does not exist on type 'T'
}
```

A **constraint** (`extends`) narrows what callers may pass and, in exchange, tells the body what it can rely on:

```ts
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}

longest('abc', 'de');        // ok: strings have length
longest([1, 2], [3]);        // number[]
longest(10, 20);             // error: number has no 'length'
```

## Constraint vs the actual type

The key difference from a plain parameter type: the function returns **`T`, the caller's exact type**, not
the constraint.

```ts
function longestLoose(a: { length: number }, b: { length: number }) {
  return a.length >= b.length ? a : b;   // { length: number }: the caller's type is lost
}

longestLoose([1, 2], [3]).map;           // error: map does not exist on { length: number }
longest([1, 2], [3]).map;                // fine: number[]
```

This is the main reason to make a function generic: **to preserve extra information** that the
constraint alone would erase. A classic example is a function that works on any object with an `id`, but
must give back the full object type:

```ts
function findById<T extends { id: number }>(items: readonly T[], id: number): T | undefined {
  return items.find((item) => item.id === id);
}

const user = findById([{ id: 1, name: 'Ada' }], 1); // { id: number; name: string } | undefined
```

## Constraints referring to other type parameters

```ts
function assignDefaults<T extends object, D extends Partial<T>>(value: T, defaults: D) { /* ... */ }
```

The most common form is `K extends keyof T`, covered in the `keyof` lesson.

## Pitfall: "could be instantiated with a different subtype"

You cannot build a brand-new value and claim it is `T`:

```ts
function withId<T extends { id: number }>(value: T): T {
  return { id: value.id };
  // error: '{ id: number; }' is assignable to the constraint of type 'T',
  // but 'T' could be instantiated with a different subtype of constraint '{ id: number; }'.
}
```

The caller decides what `T` is, possibly `{ id: number; name: string }`, so an object with only `id` is
not a valid `T`. Return the original value, spread it (`{ ...value, id }` is typed as an intersection), or
change the return type.

## When not to use a constraint

If the function never returns or relates `T`, a constraint is overkill. `function size(value: { length:
number }): number` is simpler than `size<T extends { length: number }>(value: T): number`.
