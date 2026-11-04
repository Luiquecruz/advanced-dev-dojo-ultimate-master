from dataclasses import asdict

from main import Product, with_price

catalog = [Product("Mug", 900, ["kitchen"]), Product("  Lamp ", 3000), Product("Mug", 500)]
for product in sorted(catalog):
    print(product)

sale = with_price(catalog[0], 700)
print("original price:", catalog[0].price_cents, "sale price:", sale.price_cents)
print("as dict:", asdict(sale))

try:
    sale.price_cents = 1
except AttributeError as error:
    print("frozen:", type(error).__name__)
