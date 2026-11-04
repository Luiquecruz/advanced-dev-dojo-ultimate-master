from collections import ChainMap


@test("RecentItems keeps the last items, oldest first")
def _():
    recent = mod.RecentItems(3)
    for item in ["a", "b", "c", "d"]:
        recent.add(item)
    assert recent.items() == ["b", "c", "d"]


@test("RecentItems with a limit of zero keeps nothing")
def _():
    recent = mod.RecentItems(0)
    recent.add("a")
    assert recent.items() == []


@test("Inventory tracks stock and reports zero for unknown SKUs")
def _():
    stock = mod.Inventory()
    stock.restock("pen", 5)
    stock.restock("pen", 2)
    stock.remove("pen", 3)
    assert stock.available("pen") == 4
    assert stock.available("ink") == 0


@test("Inventory.remove raises ValueError naming the SKU and leaves the stock unchanged")
async def _():
    stock = mod.Inventory()
    stock.restock("pen", 2)
    error = await capture_error(lambda: stock.remove("pen", 5))
    assert isinstance(error, ValueError)
    assert "pen" in str(error)
    assert stock.available("pen") == 2


@test("Inventory.snapshot is a plain dict without zero entries")
def _():
    stock = mod.Inventory()
    stock.restock("pen", 2)
    stock.restock("ink", 1)
    stock.remove("ink", 1)
    snapshot = stock.snapshot()
    assert snapshot == {"pen": 2}
    assert type(snapshot) is dict


@test("layered_config searches cli, env, defaults without copying them and writes to cli")
def _():
    cli = {"debug": True}
    env = {"debug": False, "port": 80}
    defaults = {"port": 8080, "host": "localhost"}
    config = mod.layered_config(cli, env, defaults)
    assert isinstance(config, ChainMap)
    assert config["debug"] is True
    assert config["port"] == 80
    assert config["host"] == "localhost"
    config["port"] = 1
    assert cli["port"] == 1
    assert env["port"] == 80
    defaults["timeout"] = 30
    assert config["timeout"] == 30
