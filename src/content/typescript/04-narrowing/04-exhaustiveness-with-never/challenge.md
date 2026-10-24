A `triangle` member was just added to `Shape`, and `area` silently returns `0` for it.

1. Implement `assertNever(value: never): never`. It throws an `Error` whose message starts with `"Unexpected value: "` followed by `JSON.stringify(value)`.
2. Handle `triangle` in `area` (`base * height / 2`).
3. Replace the `default: return 0` branch with a call to `assertNever(shape)`, so that a future member that is not handled becomes a compile error.

```ts
area({ kind: 'triangle', base: 4, height: 3 }); // 6
area({ kind: 'square', side: 2 });              // 4
```
