from collections.abc import Callable


def sort_by_length(words: list[str]) -> list[str]:
    # TODO: return a new list sorted by the length of each word.
    return list(words)


def make_multiplier(factor: int) -> Callable[[int], int]:
    def multiply(number: int) -> int:
        # TODO: multiply the number by the factor this multiplier was made with.
        return number

    return multiply


def total(*amounts: int, currency: str = "EUR") -> str:
    # TODO: add every amount and return text such as "12.50 EUR".
    return ""


def depth(value: object) -> int:
    # TODO: return 0 for a value that is not a list, else 1 plus the deepest item (call depth on each item).
    return 0
