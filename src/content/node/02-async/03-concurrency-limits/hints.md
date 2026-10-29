Think of `limit` workers, not of `items.length` promises. Each worker is an `async` function that loops: take the next unclaimed index, `await fn(...)`, store the result, repeat.
---
Share one `let next = 0` between workers and claim with `const index = next++`. JavaScript runs one piece of code at a time, so two workers can never claim the same index. Store results with `results[index] = await fn(items[index], index)` to keep input order.
---
Start `Math.min(limit, items.length)` workers with `Array.from({ length: ... }, () => worker())` and `await Promise.all(...)` on them. For fail fast, set a `failed` flag in a `catch` before rethrowing, and make the loop condition `!failed && next < items.length`. Validate with `Number.isInteger(limit) && limit >= 1` before anything else.
