Build the rule engine of an architecture test for Feature-Sliced Design. The file `dependencyRules.js` already exports `LAYERS` (from highest to lowest: `app`, `pages`, `widgets`, `features`, `entities`, `shared`) and `describeFile(path)`, which splits a path into `{ layer, slice, rest }` (`slice` is `null` for `app` and `shared`).

Implement **`checkDependencies(graph)`**.

- `graph` maps a file path to the list of files it imports, all relative to `src/`:

  ```js
  { 'features/cart/ui/CartButton.jsx': ['entities/product/index.js', 'shared/ui/Button.jsx'] }
  ```

- Return an array of violations `{ from, to, rule }`, one per offending import, **sorted by `from`, then by `to`** (plain string order). A clean graph returns `[]`.

Check each import against these rules **in this order**; the first match is the only one reported:

1. **`'upward-import'`**: the target's layer is higher than the source's layer (for example `entities` → `features`, `shared` → `app`).
2. **`'sibling-slice'`**: source and target are in the same sliced layer (`pages`, `widgets`, `features`, `entities`) but in different slices, even when the target is an `index` file.
3. **`'deep-import'`**: the target is in another slice and is not that slice's public API. The public API is the file directly in the slice folder named `index.js`, `index.jsx`, `index.ts` or `index.tsx`.

Always allowed: files of the same slice importing each other, anything inside `app` importing `app`, anything importing `shared` (any depth: shared is not sliced), and downward imports of a slice's `index` file.

The function is pure: no React, no preview.
