from main import Inventory, RecentItems, layered_config

recent = RecentItems(3)
for page in ["home", "docs", "pricing", "blog"]:
    recent.add(page)
print("recent pages:", recent.items())

stock = Inventory()
stock.restock("pen", 5)
stock.remove("pen", 5)
print("pen:", stock.available("pen"), "| snapshot:", stock.snapshot())
try:
    stock.remove("ink", 1)
except ValueError as error:
    print("error:", error)

cli = {"debug": True}
config = layered_config(cli, {"debug": False, "port": 80}, {"port": 8080, "host": "localhost"})
print("debug:", config["debug"], "port:", config["port"], "host:", config["host"])
config["port"] = 9000
print("cli now holds the write:", cli)
