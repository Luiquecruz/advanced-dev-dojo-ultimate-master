`fetchUser`, `createLogger` and `HttpClient` come from a "library" that does not export its types. Derive
every type from them (do not write the object shapes by hand), then use them.

1. `type User` — the resolved value of `fetchUser` (`Awaited` + `ReturnType`).
2. `type FetchUserOptions` — the type of `fetchUser`'s second parameter (`Parameters`).
3. `type Logger` — what `createLogger` returns.
4. `type HttpClientArgs` — the constructor arguments of `HttpClient` (`ConstructorParameters`).
5. `loadUsers(ids: number[], options: FetchUserOptions): Promise<User[]>` — fetches every user in parallel
   with `Promise.all`, keeping the order of `ids`.
6. `createClient(...args: HttpClientArgs): HttpClient` — forwards the arguments to `new HttpClient(...)`.
