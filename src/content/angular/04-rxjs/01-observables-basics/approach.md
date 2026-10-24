1. Implement `collect()` first: create a Promise, subscribe with an observer object, accumulate values in `next`, resolve in `complete`, reject in `error`.
2. Use `collect()` with `of(1, 2, 3)` mentally to confirm the order of notifications.
3. For `countdown()`, return `new Observable(subscriber => ...)` and keep all state (`current`) inside the producer so every subscriber gets its own countdown.
4. Emit the start value synchronously, then schedule the following values with `setInterval`.
5. Complete after emitting `0` and return a teardown that clears the interval.
