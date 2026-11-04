from main import Field, LazyAttribute, Model, Positive


class LineItem(Model):
    quantity = Field(1, 1000)
    unit_cents = Field(1)


class Shipment:
    weight_kg = Positive()

    def __init__(self, items, weight_kg):
        self.items = items
        self.weight_kg = weight_kg

    @LazyAttribute
    def total_cents(self):
        print("  computing total...")
        return sum(item.quantity * item.unit_cents for item in self.items)


items = [LineItem(quantity=3, unit_cents=250), LineItem(quantity=1, unit_cents=1999)]
shipment = Shipment(items, 2.5)
print("fields:", LineItem.fields())
print("total:", shipment.total_cents)
print("total again (cached):", shipment.total_cents)

try:
    LineItem(quantity=0, unit_cents=100)
except ValueError as error:
    print("rejected:", error)

try:
    shipment.weight_kg = -1
except ValueError as error:
    print("rejected:", error)
