def line_total(price_cents, quantity):
    return price_cents * quantity


def split_evenly(total_cents, people):
    share = total_cents // people
    remainder = total_cents % people
    return share, remainder


def format_cents(cents):
    return f"{cents / 100:.2f} EUR"


def kind_of(value):
    return type(value).__name__


def print_receipt(item, price_cents, quantity):
    total = line_total(price_cents, quantity)
    print(f"{quantity} x {item}")
    print(f"total {format_cents(total)}")
