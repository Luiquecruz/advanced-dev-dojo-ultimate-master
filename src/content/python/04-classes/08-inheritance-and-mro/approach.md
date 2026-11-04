1. Run `Order().save([])` on the starter and compare the log with the expected one: which mixins are missing, and why does the chain stop at `Entity`?
2. Replace each direct base call with zero-argument `super()` so each mixin hands over to whatever comes next.
3. Write `linearize` from `__mro__` and use it to print the order of the starter's `Order`.
4. Reorder the bases of `Order` until the printed MRO matches the required save order.
5. Compose two mixins in another order with `type(...)` and predict the log before running it; then try listing `Entity` before a mixin and read the error.
