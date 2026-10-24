1. Remove the annotation on `palette` and append `satisfies Record<PaletteKey, Color>` to the object literal.
2. Replace the `as` assertion on `routes` with `as const satisfies Record<string, Route>`.
3. Leave `RouteName` as `keyof typeof routes`; it now resolves to the literal key union, so invalid names are rejected.
4. Implement `accentCss` by destructuring `r`, `g` and `b` from `palette.accent` and formatting them.
