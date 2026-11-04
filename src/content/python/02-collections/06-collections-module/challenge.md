Use the right `collections` type for each of three small components in `main.py`.

## `RecentItems(limit)`

Keeps the last `limit` items added.

- `add(item)` stores an item; the oldest item is dropped when the limit is exceeded.
- `items()` returns a **list**, oldest first.
- A limit of `0` keeps nothing.

## `Inventory`

Tracks stock per SKU (use a `Counter` inside).

- `restock(sku, quantity)` adds stock.
- `remove(sku, quantity)` subtracts stock. If there is not enough, it raises `ValueError` whose message contains the SKU and leaves the stock unchanged.
- `available(sku)` returns the quantity (`0` for an unknown SKU).
- `snapshot()` returns a plain `dict` with only the SKUs whose quantity is above zero.

## `layered_config(cli, env, defaults)`

Return a `ChainMap` that looks up `cli`, then `env`, then `defaults`. It must not copy the dicts: a key added to `defaults` later is visible through it. Writing a key through the returned map must land in the `cli` dict, not in the others.
