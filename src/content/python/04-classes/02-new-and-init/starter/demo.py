from main import Currency, Percent

euro = Currency("EUR")
euro.rates["USD"] = 1.08
print("same object for 'eur':", Currency("eur") is euro)
print("rates survive the second call:", Currency("EUR").rates)
print("__init__ calls on the cached euro:", euro.init_calls)

discount = Percent("12.5%")
print("parsed percent:", discount, "is a float:", isinstance(discount, float))
print("arithmetic type:", type(discount * 2).__name__)

try:
    Percent(140)
except ValueError as error:
    print("rejected:", error)
