The `satisfies` operator (TypeScript 4.9) checks that an expression **matches a type** without changing
the type the compiler **infers** for it. It fills the gap between two older tools that each lose something.

## The problem

Imagine a palette where each color is either a hex string or an RGB object:

```ts
type Color = string | { r: number; g: number; b: number };
type PaletteKey = 'primary' | 'secondary' | 'accent';
```

**Option 1: a type annotation.** The object is validated, but the declared type wins and every property is
widened to `Color`:

```ts
const palette: Record<PaletteKey, Color> = {
  primary: '#3178c6',
  secondary: '#ffffff',
  accent: { r: 255, g: 0, b: 128 },
};

palette.primary.toUpperCase(); // error: toUpperCase does not exist on { r; g; b }
```

**Option 2: no annotation.** Inference keeps precise types, but nothing checks the object. A typo like
`acent` or a missing key goes unnoticed.

**Option 3: `as`.** A type assertion silences the compiler instead of checking: `{} as Record<PaletteKey,
Color>` compiles even though every key is missing.

## The modern way: satisfies

```ts
const palette = {
  primary: '#3178c6',
  secondary: '#ffffff',
  accent: { r: 255, g: 0, b: 128 },
} satisfies Record<PaletteKey, Color>;

palette.primary.toUpperCase(); // ok: primary is string
palette.accent.r;              // ok: accent is { r: number; g: number; b: number }
```

The object is checked against `Record<PaletteKey, Color>`: missing keys, extra keys (excess property
checks still apply) and wrong value types are all errors. But the variable's type is the inferred one,
so each property keeps its specific type.

## Combining with as const

`as const satisfies T` gives you the strictest result: deeply readonly, literal types everywhere, and still
validated:

```ts
type Route = { path: string; auth: boolean };

const routes = {
  home: { path: '/', auth: false },
  settings: { path: '/settings', auth: true },
} as const satisfies Record<string, Route>;

type RouteName = keyof typeof routes; // 'home' | 'settings'
type HomePath = typeof routes.home.path; // '/'
```

With an annotation `Record<string, Route>`, `keyof typeof routes` would be `string`, so a typo like
`routes.setings` would compile and fail at runtime. With `satisfies`, the keys stay a precise union you can
reuse to type function parameters.

Note the order: `as const` applies to the literal first, then `satisfies` checks the result. Readonly
literal types are still assignable to the mutable `Route` shape, because `satisfies` checks assignability.

## satisfies also guides inference

The target type acts as a **contextual type**, so callbacks inside the object get parameter types without
annotations:

```ts
const handlers = {
  click: (event) => event.x,
} satisfies Record<string, (event: { x: number }) => number>;
```

## When to use which

| Goal | Use |
| --- | --- |
| The variable should have exactly the declared type (for example a mutable `let` that will be reassigned) | annotation `: T` |
| Validate a literal but keep its precise inferred type | `satisfies T` |
| Validate and freeze configuration with literal types | `as const satisfies T` |
| Override the compiler because you know better (rare) | `as T` |

## Pitfalls

- `satisfies` does not change the type, so a value declared with `let` is still widened as usual
  (`let mode = 'dark' satisfies string` gives `string`).
- It only checks the expression it is attached to; it is not a runtime validation of external data.
- `satisfies` is a type-only operator and is erased from the JavaScript output.
