Match each helper to its failure policy: everything required (`all`), report every outcome (`allSettled`), first success (`any`), first to settle (`race`).
---
In `loadDashboard`, pass the three promises to `Promise.all` and attach `.catch(() => [])` to the recommendations promise only, so its failure becomes a value before `all` sees it. In `sendAll`, keep `Object.keys(channels)` so you can map each settled result back to its name by index.
---
`fastestMirror`: `try { return await Promise.any(urls.map(download)); } catch { throw new Error('All mirrors failed'); }`. `withTimeout`: create a promise that rejects from a `setTimeout`, store the timer, then `return Promise.race([work, timeout]).finally(() => clearTimeout(timer))`.
