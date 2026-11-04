from main import MISSING, Money, lookup, same_amount

prices = {"coffee": 0, "tea": None}
print("falsy value kept:", lookup(prices, "coffee"))
print("stored None kept:", lookup(prices, "tea"))
print("explicit default:", lookup(prices, "juice", None))

try:
    lookup(prices, "juice")
except KeyError as error:
    print("missing key raises:", error)

print("sentinel is not None:", MISSING is not None)

first = Money(250, "EUR")
second = Money(250, "EUR")
print("equal values:", first == second, "| same object:", first is second)
print("set size:", len({first, second, Money(250, "USD")}))
print("same amount across currencies:", same_amount(first, Money(250, "USD")))
print("compared with an int:", first == 250)
