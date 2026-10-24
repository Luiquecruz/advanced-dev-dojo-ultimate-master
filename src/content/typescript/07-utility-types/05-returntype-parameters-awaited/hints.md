Utility types need types, not values: always write `typeof fetchUser`, `typeof createLogger` and `typeof HttpClient`.
---
`ReturnType<typeof fetchUser>` is a `Promise<...>`; wrap it in `Awaited<...>` to get the user. `Parameters<typeof fetchUser>[1]` is the options type.
---
`loadUsers` is `return Promise.all(ids.map((id) => fetchUser(id, options)));` and `createClient` is `return new HttpClient(...args);`.
