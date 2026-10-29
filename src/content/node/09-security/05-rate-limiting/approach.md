1. Separate the policy (how many requests are allowed) from the transport (HTTP headers and status). Both limiters implement the same `consume` interface, so the middleware does not care which algorithm runs.
2. Inject the clock. Rate limiting is all about time, and an injected `now` makes every edge (the last millisecond of a window, half a token) testable without waiting.
3. Fixed window: derive the window from the clock instead of storing timers; a stored window that no longer matches the current start is simply replaced.
4. Token bucket: do not run a timer that adds tokens. Refill lazily from the elapsed time on each call, cap at the capacity, and compute when the next whole token arrives from the missing fraction.
5. In the middleware, always report the remaining budget, and on a block send `429` with `Retry-After` in whole seconds rounded up, so well-behaved clients never retry too early.
6. Choose the key deliberately: here it is the API key; a real API may combine user id, IP and route.
