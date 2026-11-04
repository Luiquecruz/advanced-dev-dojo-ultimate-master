import copy


class Order:
    def __init__(self):
        self.total = 10
        self.lines = []

    def add(self, amount):
        self.lines.append(amount)
        self.total += amount
        return self.total


@test("Proxy forwards reads and writes of names it does not own to the target")
async def _():
    order = Order()
    proxy = mod.Proxy(order)
    total = proxy.total
    after_add = proxy.add(5)
    proxy.status = "paid"
    missing = await capture_error(lambda: proxy.discount)
    status = getattr(order, "status", None)
    proxy_names = list(vars(proxy))
    assert total == 10
    assert after_add == 15
    assert order.total == 15
    assert status == "paid"
    assert isinstance(missing, AttributeError)
    assert "status" not in proxy_names


@test("Proxy records every forwarded read and write in log, in order")
def _():
    proxy = mod.Proxy(Order())
    proxy.total
    proxy.add(1)
    proxy.status = "paid"
    proxy.total
    log = list(proxy.log)
    assert log == [("get", "total"), ("get", "add"), ("set", "status"), ("get", "total")]


@test("dir() of a Proxy lists the target's attributes next to its own")
def _():
    proxy = mod.Proxy(Order())
    names = dir(proxy)
    assert "total" in names
    assert "add" in names
    assert "log" in names


@test("Frozen rejects new and deleted attributes after freeze() and keeps existing ones writable")
async def _():
    class Config(mod.Frozen):
        timeout = 30

        def __init__(self):
            self.host = "localhost"
            self.port = 8080
            self.freeze()

    config = Config()
    config.port = 9090
    config.timeout = 60
    added = await capture_error(lambda: setattr(config, "hots", "db.internal"))
    deleted = await capture_error(lambda: delattr(config, "host"))
    unfrozen = mod.Frozen()
    unfrozen.extra = 1
    assert config.port == 9090
    assert config.timeout == 60
    assert isinstance(added, AttributeError)
    assert "hots" in str(added)
    assert isinstance(deleted, AttributeError)
    assert config.host == "localhost"
    assert unfrozen.extra == 1


@test("Defaults answers only missing names, raises AttributeError for unknown ones and survives copy")
async def _():
    class Settings(mod.Defaults):
        region = "eu-west-1"

        def describe(self):
            return f"{self.region}:{self.retries}"

    defaults = {"retries": 3, "timeout": 30, "region": "us-east-1", "describe": "shadowed"}
    settings = Settings(defaults, timeout=5)
    retries = settings.retries
    timeout = settings.timeout
    region = settings.region
    described = settings.describe()
    missing = await capture_error(lambda: settings.unknown)
    fallback = getattr(settings, "unknown", "fallback")
    clone = copy.copy(settings)
    assert retries == 3
    assert timeout == 5
    assert region == "eu-west-1"
    assert described == "eu-west-1:3"
    assert isinstance(missing, AttributeError)
    assert fallback == "fallback"
    assert clone.retries == 3
    assert clone.timeout == 5
