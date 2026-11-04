from main import Money

cart = [Money(1999, "EUR"), Money(450, "EUR"), Money(450, "EUR")]
print("items:", cart)
print("unique prices:", sorted(set(cart)))
print(f"total: {sum(cart):.2f}")
print(f"cheapest: {min(cart)}")

try:
    Money(100, "EUR") + Money(100, "USD")
except TypeError as error:
    print("rejected:", error)

discount = Money.zero("EUR")
print("discount applied:", bool(discount))
