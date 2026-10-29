1. Identify the hidden quadratic loop in the starter: `users.find` runs once per order, so 40 000 × 40 000 comparisons in the worst case.
2. Write `indexBy` first; it is the building block of the join. `Map.set` overwrites existing keys, which gives "later wins" for free.
3. Write `groupBy` with a single loop: look up the current group, push into it or create it. A `Map` keeps the order in which keys were first inserted, which is exactly the required group order.
4. For `uniqueEmails`, normalize before deduplicating, then rely on the insertion order of a `Set`.
5. Rewrite `withCustomer` to build the user index once (linear) and do one `O(1)` lookup per order. Spread each order into a new object so the inputs stay untouched, and fall back to `null` with `?? null`.
6. For `diffIds`, turn each list into a `Set` once and filter the other list against it: `O(before + after)` instead of `includes` in a loop.
