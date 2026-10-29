1. Write down the dependency between concerns: the logger needs the request id, so `requestId()` goes first; CORS and timing only need to wrap the routes.
2. Write the logging middleware in the onion shape: capture the start before `await next()`, build the entry after it, when `c.res` holds the final status (including the `500` produced from the thrown error and the `404` from the not found handler).
3. Call the injected `options.log` instead of `console.log`, so tests (and a real logger in production) receive structured objects.
4. Scope CORS to `/api/*` with an explicit origin list; add `X-Request-Id` to the exposed headers so frontend code can read it for bug reports.
5. Add `timing()` and measure the slow part of the handler with a named metric; the header is assembled for you when the response leaves.
6. Exercise each concern once: a plain request, a request with an incoming id, a failing route, a preflight and a foreign origin.
