Use two maps: `entries` for stored `{ value, storedAt }` and `inFlight` for pending promises. `getOrLoad` checks them in that order: fresh entry, then in-flight promise, then a new load.
---
Build the new promise with `load().then(onValue, onError)` and put it in `inFlight` before returning it. `onValue` stores the entry and deletes the in-flight promise; `onError` deletes the in-flight promise and rethrows.
---
For the invalidation race, `invalidate` deletes from both maps, and the load callbacks only write when they are still the current load: `if (this.inFlight.get(key) === promise) { ... }`. Declare it as `const promise: Promise<V> = load().then(...)` so the callbacks can reference it.
