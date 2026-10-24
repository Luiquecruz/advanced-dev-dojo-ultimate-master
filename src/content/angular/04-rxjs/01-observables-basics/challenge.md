Write two utilities in `app.ts` (no component needed).

**`countdown(start: number, periodMs: number): Observable<number>`**

1. Built with `new Observable`.
2. Lazy: it must not start any timer until someone subscribes.
3. Emits `start` immediately on subscribe, then `start - 1`, `start - 2`… every `periodMs` with `setInterval`, and completes right after emitting `0`.
4. Returns a teardown that clears the interval, so unsubscribing early stops all emissions.

Example: `countdown(3, 10)` emits `3, 2, 1, 0` and completes.

**`collect<T>(source: Observable<T>): Promise<T[]>`**

1. Subscribes to `source` with an observer object.
2. Resolves with every emitted value (in order) when the source completes.
3. Rejects with the source error when it errors.

Do not use `toArray`, `firstValueFrom` or `lastValueFrom`: implement it with `subscribe`.
