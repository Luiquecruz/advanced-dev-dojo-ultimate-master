The code below uses annotations and an assertion that throw away useful type information. Refactor it with
`satisfies` so that the values stay validated **and** precise.

1. `palette` must be checked against `Record<PaletteKey, Color>` while keeping its inferred property types:
   `palette.primary` is `string` and `palette.accent` is `{ r: number; g: number; b: number }`.
   Remove the type annotation on `palette`.
2. `routes` must be checked against `Record<string, Route>` while keeping literal types:
   `keyof typeof routes` is `'home' | 'profile' | 'settings'` and `routes.home.path` is the literal `'/'`.
   Remove the `as` assertion.
3. `RouteName` stays declared as `keyof typeof routes`, so after the refactor
   `routePath('unknown')` becomes a compile error.
4. `routePath(name)` keeps returning the `path` of the route (for example `routePath('profile')` returns
   `'/profile'`).
5. `accentCss()` must return `'rgb(255, 0, 128)'` using the `r`, `g` and `b` fields of `palette.accent`
   directly, without type assertions or narrowing.
