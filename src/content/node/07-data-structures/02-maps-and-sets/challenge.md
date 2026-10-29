An admin dashboard needs reports over users and orders that can reach tens of thousands of rows. Implement the helpers in `main.ts` with `Map` and `Set` so every function is linear.

```ts
interface User { id: number; name: string; email: string }
interface Order { id: number; userId: number; status: 'pending' | 'paid' | 'shipped'; total: number }
```

1. `indexBy(items, key)` returns a `Map` from `key(item)` to the item. When two items share a key, the **later** one wins.
2. `groupBy(items, key)` returns a `Map` from `key(item)` to an array of items. Groups appear in the order their key is first seen, and items keep their input order.
3. `uniqueEmails(users)` returns the emails trimmed and lowercased, without duplicates, in the order they first appear.
4. `withCustomer(orders, users)` returns **new** order objects with every original field plus `customerName`: the name of the user whose `id` equals `order.userId`, or `null` when there is none. The input orders are not modified. It must handle 60 000 orders and 60 000 users in well under a second: no `find` inside the loop.
5. `diffIds(before, after)` compares two lists of ids (for example the members of a team before and after an update) and returns `{ added, removed }`: `added` holds the ids of `after` missing from `before` (in `after` order), `removed` the ids of `before` missing from `after` (in `before` order).
