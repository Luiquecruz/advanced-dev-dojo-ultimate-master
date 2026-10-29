Implement four helpers, one per combinator. Each one is a policy for running independent async work concurrently.

1. `loadDashboard(api)` calls `api.getUser()`, `api.getOrders()` and `api.getRecommendations()` **at the same time** (all three are called before any of them resolves) and returns `{ user, orders, recommendations }`.
   - User and orders are required: if either rejects, `loadDashboard` rejects with that error.
   - Recommendations are optional: if that call rejects, use `[]`.
2. `sendAll(channels)` receives an object of named send functions, for example `{ email: () => Promise, sms: () => Promise }`. It calls all of them concurrently, **never rejects**, and resolves with `{ sent, failed }`:
   - `sent`: names of the channels that fulfilled, in the object's key order;
   - `failed`: `{ name, reason }` for each rejected channel, in key order, where `reason` is the error's `message`.
3. `fastestMirror(urls, download)` starts `download(url)` for every URL and resolves with the **first successful** result, even if another mirror failed earlier. When every download fails it rejects with `Error('All mirrors failed')`.
4. `withTimeout(work, ms)` resolves or rejects like `work` if it settles within `ms` milliseconds; otherwise it rejects with `Error('Timed out after <ms> ms')` (for example `Timed out after 15 ms`). Clear the timer once the race is decided.

Use `Promise.all`, `Promise.allSettled`, `Promise.any` and `Promise.race` (each at least once).
