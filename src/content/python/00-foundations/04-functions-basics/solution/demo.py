from main import apply_discount, bounds, stats

print("standard discount on 20.00 EUR:", apply_discount(2000))
print("summer sale, 25 per cent:", apply_discount(2000, percent=25))

daily_orders = [12, 7, 19, 4, 13]
lowest, mean, highest = stats(daily_orders)
print("orders per day: lowest", lowest, "mean", mean, "highest", highest)
print("range:", bounds(daily_orders))
print("range of an empty week:", bounds([]))
