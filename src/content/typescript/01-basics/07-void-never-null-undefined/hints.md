`Array.prototype.find` already returns `User | undefined`. Indexing with `users[0]` claims there is always a user.
---
Chain optional access with nullish coalescing: `a?.b ?? fallback`. Unlike `||`, `??` only falls back on `null` and `undefined`, so `0` survives.
---
A function declaration that only throws is inferred as `void`; write `function fail(message: string): never`.
