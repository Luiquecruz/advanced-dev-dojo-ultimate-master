Every function is one pass over its input plus `O(1)` operations on a `Map` or a `Set`. If you see `find`, `includes` or `indexOf` inside a loop, that is the quadratic part to replace.
---
`indexBy` is `map.set(key(item), item)` in a loop (`set` overwrites, so later items win). `groupBy` reads the group with `map.get(groupKey)` and either pushes into it or creates `[item]`.
---
`uniqueEmails`: normalize first (`email.trim().toLowerCase()`), then spread a `Set` back into an array. `diffIds`: build `new Set(before)` and `new Set(after)` once and `filter` each list against the other set.
---
`withCustomer`: `const usersById = indexBy(users, (user) => user.id)`, then `orders.map((order) => ({ ...order, customerName: usersById.get(order.userId)?.name ?? null }))`.
