1. Derive `User` by unwrapping the promise returned by `fetchUser` with `Awaited<ReturnType<...>>`.
2. Index the `Parameters` tuple at `1` for the options type.
3. Use `ReturnType` for the logger and `ConstructorParameters` for the client arguments.
4. Map the ids to `fetchUser` calls and combine them with `Promise.all`, which preserves order.
5. Spread the typed argument tuple into the `HttpClient` constructor.
