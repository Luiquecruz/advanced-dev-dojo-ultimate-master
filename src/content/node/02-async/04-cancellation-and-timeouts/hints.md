In `sleep`, inside `new Promise((resolve, reject) => ...)`: check `signal?.aborted` first, then start the timer, then `signal?.addEventListener('abort', onAbort, { once: true })`. `onAbort` clears the timer and calls `reject(signal.reason)`; the timer callback removes the listener before resolving.
---
`withTimeout` starts with `const timeout = AbortSignal.timeout(ms); const signal = parent ? AbortSignal.any([parent, timeout]) : timeout;`. Returning `task(signal)` alone is not enough: a task that ignores the signal would never settle.
---
Wrap it in `new Promise((resolve, reject) => ...)`: reject with `signal.reason` from an `'abort'` listener, and forward the task with `task(signal).then(resolve, reject)`. A promise only settles once, so whichever comes first wins. For `latestOnly`, keep `let current: AbortController | undefined` in the closure and call `current?.abort()` before creating the next one.
