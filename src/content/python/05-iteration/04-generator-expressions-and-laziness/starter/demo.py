from main import count_evaluations, first_match, total_valid

carts = [
    {"id": "c1", "items": 0, "amount": 0},
    {"id": "c2", "items": 3, "amount": 42.5},
    {"id": "c3", "items": 1, "amount": 980.0},
    {"id": "c4", "items": 2, "amount": 15.0},
]

checked = []


def is_large(cart):
    checked.append(cart["id"])
    return cart["amount"] > 500


print("first large cart:", first_match(carts, is_large)["id"], "| carts checked:", checked)
print("first cart over 5000:", first_match(carts, lambda cart: cart["amount"] > 5000, default="none"))
print("total of non-empty carts:", total_valid(carts, lambda cart: cart["items"] > 0))

stream = (cart for cart in carts)
nothing = {"id": "none"}
print("from a stream, first non-empty:", first_match(stream, lambda cart: cart["items"] > 0, nothing)["id"])
print("same stream, next non-empty:", first_match(stream, lambda cart: cart["items"] > 0, nothing)["id"])

found, calls = count_evaluations(carts, lambda cart: cart["amount"] > 500)
print(f"fraud rule fired: {found} after {calls} of {len(carts)} checks")
