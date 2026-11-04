Turn `Product` in `main.py` into an immutable, ordered value object and add a helper that derives a changed copy.

## `Product(name, price_cents, tags=...)`

A dataclass with three fields, in this order:

- `name: str`
- `price_cents: int`
- `tags: list[str]`: defaults to a **new empty list for each product**.

Behavior:

- **Frozen**: assigning any field raises `dataclasses.FrozenInstanceError`.
- **Ordered**: products sort by `name`, then by `price_cents`.
- `tags` takes **no part** in equality, ordering or hashing: `Product("Mug", 900, ["kitchen"]) == Product("Mug", 900)`, and products can be put in a `set`.
- `__post_init__` strips surrounding whitespace from `name` and raises `ValueError` when the stripped name is empty or `price_cents` is negative.

## `with_price(product, price_cents)`

Return a **new** `Product` with the new price and every other field kept. The original is unchanged, and the new product is validated like any other (`with_price(mug, -5)` raises `ValueError`).

Use `dataclasses.field` and `dataclasses.replace`.
