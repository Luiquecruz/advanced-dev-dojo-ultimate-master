Bridge a legacy `BehaviorSubject` service into signals. **`bridge.ts`** contains `LegacyUsers` (given and complete) and exports the `UsersFacade` you write.

1. `UsersFacade` is `@Injectable({ providedIn: 'root' })` and injects `LegacyUsers`.
2. `users`: a signal created with `toSignal(this.legacy.users$, { requireSync: true })`.
3. `count`: a `computed` with the number of users.
4. `query`: a writable `signal('')`. `filtered`: a `computed` with the users whose name contains the query, ignoring case.
5. `add(name: string)` calls `legacy.add(name)`.
6. `added`: a plain array `string[]` that receives every name emitted by `legacy.added$`. Subscribe in the constructor with `takeUntilDestroyed()` so nothing is received after the facade is destroyed.
