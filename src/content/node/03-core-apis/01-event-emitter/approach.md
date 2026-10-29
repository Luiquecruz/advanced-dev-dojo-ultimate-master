1. Start with `pay`: validate first and emit `'error'` for invalid amounts, returning early so `'paid'` is never emitted for the same call.
2. For `onPaid`, keep the exact function reference you pass to `on`, because `off` compares references; return a closure that calls `off` with it.
3. For `nextPayment`, use the promise version of `once` from `node:events` instead of building a `new Promise` by hand: it already rejects on `'error'` and removes both listeners afterwards.
4. Remember that `once` resolves with an array of arguments, so destructure the first one.
5. `attachErrorLogger` only needs an `'error'` listener; once any listener exists, `emit('error')` no longer throws.
6. Press **Run** to watch the order of logs: `emit` is synchronous, so listeners run before `pay` returns.
