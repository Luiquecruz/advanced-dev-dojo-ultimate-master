Move the type from the left side of `=` to the end of the object literal: `const palette = { ... } satisfies Record<PaletteKey, Color>;`.
---
For `routes`, replace `as Record<string, Route>` with `as const satisfies Record<string, Route>`. `as const` keeps the literal paths, `satisfies` keeps the validation.
---
Once `palette.accent` is inferred as `{ r: number; g: number; b: number }`, you can destructure it directly: `const { r, g, b } = palette.accent;`.
