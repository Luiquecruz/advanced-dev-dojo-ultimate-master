These user helpers compile, but they hide null bugs. Fix them with strict null handling.

1. `findUser(users, id)` must return `User | undefined`: the matching user, or `undefined` when none matches.
2. `displayName(user: User | undefined): string` returns the nickname when defined, otherwise the name, otherwise `"Guest"`. Remove the non-null assertions (`!`).
3. `retryCount(settings: Settings | null): number` returns `settings.retries` when it is set (including `0`), otherwise `3`.
4. Annotate `fail(message: string)` so its return type is `never`. It throws an `Error` with the given message.

```ts
displayName(undefined);                 // "Guest"
retryCount({ retries: 0 });             // 0
retryCount(null);                       // 3
```
