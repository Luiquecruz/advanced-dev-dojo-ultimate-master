from main import add_item, empty_carts, merge_carts, snapshot

cart = ["book"]
saved = snapshot(cart)
add_item(cart, "pen")
print("cart:", cart)
print("snapshot unchanged:", saved == ["book"])

merged = merge_carts(["book"], ["pen"])
print("merged:", merged)

carts = empty_carts(3)
carts[0].append("lamp")
print("independent carts:", carts)
