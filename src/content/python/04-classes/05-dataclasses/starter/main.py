from dataclasses import dataclass, field, replace


# TODO: make Product frozen and ordered.
@dataclass
class Product:
    name: str
    price_cents: int
    # TODO: give each product its own list, and keep tags out of comparison, ordering and hashing.
    tags: list[str] | None = None

    def __post_init__(self) -> None:
        # TODO: strip the name, reject an empty name and a negative price with ValueError.
        if self.tags is None:
            self.tags = []


def with_price(product: Product, price_cents: int) -> Product:
    # TODO: return a new Product with the new price and every other field kept, validated again.
    product.price_cents = price_cents
    return product
