from dataclasses import dataclass, field, replace


@dataclass(frozen=True, order=True)
class Product:
    name: str
    price_cents: int
    tags: list[str] = field(default_factory=list, compare=False)

    def __post_init__(self) -> None:
        name = self.name.strip()
        if not name:
            raise ValueError("name must not be empty")
        if self.price_cents < 0:
            raise ValueError(f"price_cents must not be negative, got {self.price_cents}")
        object.__setattr__(self, "name", name)


def with_price(product: Product, price_cents: int) -> Product:
    return replace(product, price_cents=price_cents)
