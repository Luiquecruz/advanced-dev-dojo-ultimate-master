import typing


class Report:
    def __init__(self, title):
        self.title = title

    def render(self):
        return self.title.upper()


class Connection:
    def __init__(self, log):
        self.log = log

    def close(self):
        self.log.append("closed")


class Silent:
    pass


@test("Badge satisfies Renderable by shape, without inheriting from it")
def _():
    badge = mod.Badge("new")
    rendered = badge.render()
    inherits = mod.Renderable in type(badge).__mro__
    assert rendered == "[new]"
    assert inherits is False
    matches = isinstance(badge, mod.Renderable)
    subclass = issubclass(mod.Badge, mod.Renderable)
    assert matches is True
    assert subclass is True


@test("Renderable and Closeable are runtime-checkable protocols that match by member names")
def _():
    kinds = [typing.is_protocol(mod.Renderable), typing.is_protocol(mod.Closeable)]
    assert kinds == [True, True]
    render_members = typing.get_protocol_members(mod.Renderable)
    close_members = typing.get_protocol_members(mod.Closeable)
    assert render_members == frozenset({"render"})
    assert close_members == frozenset({"close"})
    checks = [
        isinstance(Report("q3"), mod.Renderable),
        isinstance(Connection([]), mod.Closeable),
        isinstance(Silent(), mod.Renderable),
        isinstance("text", mod.Renderable),
        isinstance(42, mod.Closeable),
    ]
    assert checks == [True, True, False, False, False]


@test("render_all renders every conforming item in order and skips the rest")
def _():
    items = [mod.Badge("a"), Silent(), Report("q3"), "text", 7, mod.Badge("b")]
    rendered = mod.render_all(items)
    assert rendered == ["[a]", "Q3", "[b]"]


# beginner mistake: an ABC for Closeable, so a resource with close() that does not inherit from it is skipped
@test("close_all closes every conforming resource once and reports how many it closed")
def _():
    log = []
    resources = [Connection(log), Silent(), Connection(log), mod.Badge("x")]
    closed = mod.close_all(resources)
    assert closed == 2
    assert log == ["closed", "closed"]


@test("the protocols cannot be instantiated")
async def _():
    for protocol in (mod.Renderable, mod.Closeable):
        error = await capture_error(lambda: protocol())
        assert isinstance(error, TypeError)
