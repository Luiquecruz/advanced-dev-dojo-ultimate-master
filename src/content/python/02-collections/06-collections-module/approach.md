1. Match each requirement with the collection that already provides it: bounded history, counting, layered lookup.
2. `RecentItems`: wrap a `deque` with a `maxlen`.
3. `Inventory`: keep a `Counter`, validate before `remove` changes it, and filter zero counts in `snapshot`.
4. `layered_config`: build a `ChainMap` over the three original dicts in priority order.
5. Check the edge cases: limit 0, unknown SKU, insufficient stock, write target of the chain.
