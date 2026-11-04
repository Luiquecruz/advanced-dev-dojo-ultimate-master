from pydantic import ValidationError

from main import coercions, parse_lax, parse_strict

partner = {"order_id": "17", "quantity": "2", "unit_price": "9.50", "express": "yes", "paid": True}
internal = {"order_id": 17, "quantity": 2, "unit_price": 9, "paid": True}
forged = {**partner, "paid": "yes"}


def report(label, parse, data):
    try:
        print(f"{label}: accepted", repr(parse(data)))
    except ValidationError as error:
        print(f"{label}: rejected", sorted((".".join(map(str, item["loc"])), item["type"]) for item in error.errors()))


report("partner, lax", parse_lax, partner)
print("  conversions:", coercions(partner))
report("partner, strict", parse_strict, partner)
report("internal, strict", parse_strict, internal)
report("forged paid flag, lax", parse_lax, forged)
