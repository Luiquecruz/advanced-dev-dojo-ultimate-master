Keep a list of the steps whose action succeeded. When an action throws, that list is exactly what needs compensating; the failing step is never in it because it is added only after `await step.action(context)` returns.
---
Compensate with a `for` loop over `[...completed].reverse()` and wrap each `await step.compensate(context)` in its own `try`/`catch`: success pushes the name to `compensated`, failure pushes it to `failedCompensations`, and the loop keeps going either way.
---
For the idempotent handler, store the **promise** in a `Map<string, Promise<Res>>` before it settles, so a concurrent retry finds it. Create it with `Promise.resolve().then(() => handler(request))` so a synchronous throw also becomes a rejection, and attach `.catch(() => results.delete(key))` so a failure is forgotten.
