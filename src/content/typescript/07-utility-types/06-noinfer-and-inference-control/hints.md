Wrap only the positions that should be checked, not inferred: `initial: NoInfer<TState>` and `fallback: NoInfer<TOption>`.
---
In `transition`, check membership with `states.includes(to)` before pushing to `visited`.
---
`parseOption` can use `allowed.find((option) => option === input) ?? fallback`, which returns a `TOption` without any cast.
