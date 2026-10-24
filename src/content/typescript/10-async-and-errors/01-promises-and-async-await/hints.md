For the timeout, create a second promise that only ever rejects, then let `Promise.race` decide which one settles first.
---
Store the id returned by `setTimeout` in a variable declared outside the promise executor, and call `clearTimeout` in a `finally` block so it runs whether the race resolved or rejected.
---
Inside `try`, write `return await Promise.race([promise, timeout])`. Without `await`, `finally` would clear the timer before the race is decided.
---
For the dashboard, create both promises before awaiting anything: `const [user, orders] = await Promise.all([api.getUser(userId), api.getOrders(userId)]);`
