Most of the work is decorator options: `@dataclass(frozen=True, order=True)`. Ordering compares fields in definition order, so `name` then `price_cents` already gives the required sort.
---
`tags: list[str] = []` is rejected as a shared mutable default. Use `field(default_factory=list, compare=False)`: the factory builds one list per instance, and `compare=False` removes the field from `__eq__`, ordering and the generated `__hash__`.
---
In a frozen dataclass `self.name = ...` raises even inside `__post_init__`; normalize with `object.__setattr__(self, "name", stripped)`. For `with_price`, `replace(product, price_cents=price_cents)` runs `__init__` and `__post_init__` again.
