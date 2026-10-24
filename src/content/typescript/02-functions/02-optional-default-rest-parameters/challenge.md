Modernize a small text utility module.

1. `formatName(first: string, last?: string): string` returns `"<first> <last>"`, or just `first` when `last` is missing. Make `last` optional.
2. Refactor `repeatText` to use **default parameters**: `times` defaults to `2` and `separator` defaults to `" "`. `repeatText('ha', 0)` must return `""` (the current `||` code gets this wrong).
3. Replace the legacy `arguments` object in `sum` with a typed rest parameter so `sum()`, `sum(1)` and `sum(1, 2, 3)` all compile and return the total.

```ts
formatName('Ada');            // "Ada"
repeatText('ha', 3, '-');     // "ha-ha-ha"
sum(1, 2, 3);                 // 6
```
