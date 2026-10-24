## Literal types

A **literal type** is a type with exactly one value: `'GET'`, `42`, `true`. On its own it is rarely useful, but a **union of literals** describes a closed set of allowed values:

```ts
type Theme = 'light' | 'dark' | 'system';

function setTheme(theme: Theme) { /* ... */ }

setTheme('dark');
setTheme('blue'); // Error: Argument of type '"blue"' is not assignable to parameter of type 'Theme'
```

This replaces the "magic string" problem of plain JavaScript: typos are compile errors and editors autocomplete the valid options.

## Widening

TypeScript chooses how specific an inferred type should be based on whether the value can change:

```ts
const method = 'GET';   // "GET"   (a const can never hold anything else)
let other = 'GET';      // string  (a let can be reassigned)

const request = { url: '/users', method: 'GET' };
// { url: string; method: string }  object properties are mutable, so they widen
```

The last line causes the classic error:

```ts
function send(url: string, method: 'GET' | 'POST') { /* ... */ }

send(request.url, request.method);
// Error: Argument of type 'string' is not assignable to parameter of type '"GET" | "POST"'
```

## `as const`

A **const assertion** tells the compiler "this value will never change", so it infers the narrowest possible type and makes everything `readonly`:

```ts
const request = { url: '/users', method: 'GET' } as const;
// { readonly url: "/users"; readonly method: "GET" }

const sizes = ['sm', 'md', 'lg'] as const;
// readonly ["sm", "md", "lg"]
```

`as const` is not a runtime freeze (use `Object.freeze` for that). It only affects types, and it works on literals only: `someVariable as const` is an error.

## Deriving unions from values

With `as const` the **values become the single source of truth** and the type is derived from them, so the list and the type can never drift apart:

```ts
const SIZES = ['sm', 'md', 'lg'] as const;
type Size = (typeof SIZES)[number];          // "sm" | "md" | "lg"

const ROLES = { admin: 'Admin', editor: 'Editor' } as const;
type RoleKey = keyof typeof ROLES;            // "admin" | "editor"
type RoleLabel = (typeof ROLES)[RoleKey];     // "Admin" | "Editor"
```

`typeof` lifts a value into the type world, and `[number]` indexes "any element" of the tuple. At runtime you still have the array, which is handy for validation (`SIZES.includes(input)`), dropdown options or iteration.

## Legacy vs modern

Older code often declared a plain union and, separately, an array of the same strings to loop over. Adding a value meant editing both places. The modern pattern is a single `as const` value plus a derived type, or an enum when you need a namespace-like object (next lesson compares the two).

## Pitfalls

- Declaring `let method: 'GET' | 'POST' = 'GET'` keeps the union but narrows to `'GET'` until reassigned; that is control flow analysis, not widening.
- `as const` arrays are readonly: functions that receive them must accept `readonly string[]`, not `string[]`.
- `includes` on a readonly tuple only accepts its own literal type as argument, so checking an arbitrary `string` needs a small type guard (covered in the narrowing module).
