from main import make_record_class

LineItem = make_record_class("LineItem", ["sku", "quantity", "unit_cents"])

order = [LineItem("A-1", 3, 250), LineItem(sku="B-2", quantity=1, unit_cents=1999)]
for item in order:
    print(item)
print("total cents:", sum(item.quantity * item.unit_cents for item in order))

match order[0]:
    case LineItem(sku, quantity, _):
        print("first line:", sku, "x", quantity)

print("equal to a plain tuple?", order[0] == ("A-1", 3, 250))

try:
    LineItem("C-3", 1)
except TypeError as error:
    print("rejected:", error)

try:
    make_record_class("Broken", ["sku", "class"])
except ValueError as error:
    print("rejected:", error)
