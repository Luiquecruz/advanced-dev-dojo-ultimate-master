`fetch` resolves even for a `500`. Check `response.ok` in `fetchUsers` and `` throw new Error(`Request failed: ${response.status}`) `` before parsing.
---
Replace the empty `.catch(() => {})` with real handling: add an `error` state and store the rejection in it. Render the alert branch before the loading branch.
---
To retry, keep a counter in state (`attempt`) and list it in the effect dependencies. The Retry button increments it; the effect resets `users` and `error` and fetches again. Use an `ignore` flag in the cleanup to drop stale results.
