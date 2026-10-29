The adapter's job is translation in both directions: cents to `(amountCents / 100).toFixed(2)`, `currency.toUpperCase()`, and the callback to a promise with `new Promise((resolve, reject) => ...)`.
---
A decorator is a function that returns `{ async charge(amountCents, currency) { ... } }` and calls `gateway.charge(...)` inside. For logging, wrap the call in `try/catch`, log in both branches and `throw error` again in the `catch`.
---
`withLimit` checks before delegating: `if (amountCents > maxAmountCents) throw new Error(...)`; the inner gateway is never reached for rejected amounts.
---
In the factory, build the base with a `switch (config.provider)` whose `default` throws. Then `const limited = config.maxAmountCents === undefined ? base : withLimit(base, config.maxAmountCents)` and `return config.logging ? withLogging(limited, deps.log) : limited`.
