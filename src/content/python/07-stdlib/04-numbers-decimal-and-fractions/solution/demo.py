from decimal import Decimal

from main import exact_ratio, round_money, split_bill

print("float sum:", 0.1 + 0.2, "| exact:", round_money("0.1") + round_money("0.2"))
print("round(2.675, 2):", round(2.675, 2), "| round_money('2.675'):", round_money("2.675"))
print("Decimal(2.675) is really", Decimal(2.675))

shares = split_bill(1000, 3)
print("split 10.00 three ways:", shares, "| sum:", sum(shares))

rate = exact_ratio("1/3")
print("1/3 of 9 exactly:", rate * 9, "| as float:", float(rate) * 9)

for bad in ("9" * 100, "NaN", 2.675):
    try:
        round_money(bad)
    except (TypeError, ValueError) as error:
        print("refused:", type(error).__name__, error)
