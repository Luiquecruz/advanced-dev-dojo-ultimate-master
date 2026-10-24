The dashboard loads slowly and sometimes hangs forever. Fix both problems.

1. Implement `withTimeout<T>(promise: Promise<T>, ms: number): Promise<T>`:
   - resolves with the promise's value when it settles within `ms` milliseconds
   - rejects with an `Error` whose message is exactly `"Timed out after <ms>ms"` otherwise
   - clears its timer once the race is decided
2. Refactor `loadDashboard(api: Api, userId: number): Promise<Dashboard>` so `api.getUser` and `api.getOrders` run **in parallel** with `Promise.all` instead of one after the other. The returned object must stay the same:
   - `userName`: the user's name
   - `orderCount`: number of orders
   - `revenue`: sum of every order's `total`

```ts
await withTimeout(delay(10).then(() => 'ok'), 100); // "ok"
await withTimeout(delay(100), 10);                  // rejects: "Timed out after 10ms"
await loadDashboard(api, 1);                        // { userName: "Ada", orderCount: 2, revenue: 75 }
```

Keep both functions' signatures as declared.
