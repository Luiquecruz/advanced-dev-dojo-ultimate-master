1. Treat every argument as read-only. The tests freeze them, so any assignment or `push` throws immediately and points at the impure line.
2. `addItem` has two branches: merge (map over the items, copy the matching one with the new quantity) or append (spread the old items plus the new one). Both return a fresh cart object.
3. `removeItem` is a single `filter`.
4. Write `pipe` with `reduce`, starting from the input value; with no functions, `reduce` returns the start value, which gives the identity for free.
5. Rules are factories: the outer call captures the configuration (`percent`, `threshold`), the inner function maps a summary to a new summary. Round the discount once, where the percentage is applied.
6. `priceCart` is the composition: build the base summary, run `pipe(...rules)`, and compute `total` last from the final discount and shipping so no rule has to keep it consistent.
