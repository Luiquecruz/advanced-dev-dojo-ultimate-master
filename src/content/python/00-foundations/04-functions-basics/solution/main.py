def apply_discount(price_cents, percent=10):
    """Return the price after the discount, in whole cents."""
    return price_cents - price_cents * percent // 100


def stats(numbers):
    """Return the lowest number, the mean and the highest number."""
    if len(numbers) == 0:
        return None, None, None
    mean = sum(numbers) / len(numbers)
    return min(numbers), mean, max(numbers)


def bounds(numbers):
    """Return the range of the numbers as text, such as "2 to 9"."""
    if len(numbers) == 0:
        return "no numbers"
    lowest, _, highest = stats(numbers)
    return f"{lowest} to {highest}"
