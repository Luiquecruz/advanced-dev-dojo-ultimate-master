Create the signal before calling `fetch` (`const signal = AbortSignal.timeout(options.timeoutMs ?? 2000)`) and keep it in a variable: after a rejection, `signal.aborted` tells you whether the timeout fired or the network failed.
---
`fetch` resolves for every HTTP status. After the `try/catch` around `fetch`, check `response.status === 404` first, then `!response.ok`, and only then read `response.json()` inside its own `try/catch` for the invalid-JSON case.
---
`getUserProfile`: `const [user, posts] = await Promise.all([fetchJson(...users...), fetchJson(...posts?userId=...)])` and return `{ id: user.id, name: user.name, postCount: posts.length }`. In the server, wrap the call in `try/catch` and use `error instanceof UpstreamError` to send `error.status` with `{ error: error.message }`.
