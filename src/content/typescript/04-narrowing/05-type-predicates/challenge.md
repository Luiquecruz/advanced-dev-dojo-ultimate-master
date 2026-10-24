Validate data coming from an untyped source.

1. Implement `isUser(value: unknown): value is User`. It returns `true` only for non-null objects whose `id` is a number and whose `name` is a string.
2. Implement `validUsers(values: unknown[]): User[]` that keeps only the valid users. Use `isUser` with `filter`.
3. Fix `compact(values: (string | null | undefined)[]): string[]`: it must remove `null` and `undefined` but **keep empty strings**, and it must not use a type assertion. An arrow function with an explicit comparison lets TypeScript 5.5+ infer the predicate.

```ts
isUser({ id: 1, name: 'Ada' });     // true
isUser({ id: '1', name: 'Ada' });   // false
compact(['a', null, '', undefined]); // ['a', '']
```
