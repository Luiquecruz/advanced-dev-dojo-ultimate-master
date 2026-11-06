from collections.abc import Callable


def sort_by_length(words: list[str]) -> list[str]:
    return sorted(words, key=len)


def make_multiplier(factor: int) -> Callable[[int], int]:
    def multiply(number: int) -> int:
        return number * factor

    return multiply


def total(*amounts: int, currency: str = "EUR") -> str:
    return f"{sum(amounts) / 100:.2f} {currency}"


def depth(value: object) -> int:
    if not isinstance(value, list):
        return 0
    deepest = 0
    for item in value:
        item_depth = depth(item)
        if item_depth > deepest:
            deepest = item_depth
    return 1 + deepest
