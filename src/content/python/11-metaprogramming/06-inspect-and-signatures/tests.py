import functools

AVAILABLE = {"db": "postgres", "cache": "redis", "clock": "utc", "user": "ada"}


@test("call_with passes only the parameters a function declares and keeps defaults for the rest")
def _():
    def handler(db, user, limit=10):
        return (db, user, limit)

    def report(clock, *args, **kwargs):
        return (clock, args, kwargs)

    def health():
        return "ok"

    handled = mod.call_with(handler, AVAILABLE)
    reported = mod.call_with(report, AVAILABLE)
    healthy = mod.call_with(health, AVAILABLE)
    assert handled == ("postgres", "ada", 10)
    assert reported == ("utc", (), {})
    assert healthy == "ok"


@test("a required parameter missing from the available values raises TypeError naming it")
async def _():
    def checkout(db, *, payment_gateway, retries=3):
        return "charged"

    error = await capture_error(lambda: mod.call_with(checkout, AVAILABLE))
    assert isinstance(error, TypeError)
    assert "payment_gateway" in str(error)


@test("positional-only and keyword-only parameters are injected in the form they require")
def _():
    def connect(db, /, timeout=5, *, user, cache="none"):
        return (db, timeout, user, cache)

    def lookup(key="default", /, *, clock):
        return (key, clock)

    def window(start=0, db=None, /):
        return (start, db)

    connected = mod.call_with(connect, AVAILABLE)
    looked_up = mod.call_with(lookup, AVAILABLE)
    windowed = mod.call_with(window, AVAILABLE)
    assert connected == ("postgres", 5, "ada", "redis")
    assert looked_up == ("default", "utc")
    assert windowed == (0, "postgres")


# beginner mistake: reading parameter names from __code__, which shows a decorator's wrapper and is missing on partials and callable objects
@test("call_with reads signatures through decorators, partials, callable objects and not-yet-defined annotations")
def _():
    def logged(function):
        @functools.wraps(function)
        def wrapper(*args, **kwargs):
            return function(*args, **kwargs)

        return wrapper

    @logged
    def audit(user: User, clock: Clock) -> AuditEntry:
        return f"{user}@{clock}"

    def scale(factor, db):
        return (factor, db)

    class Greeter:
        def __call__(self, user, greeting="hello"):
            return f"{greeting} {user}"

    decorated = mod.call_with(audit, AVAILABLE)
    partial = mod.call_with(functools.partial(scale, 2), AVAILABLE)
    callable_object = mod.call_with(Greeter(), AVAILABLE)
    assert decorated == "ada@utc"
    assert partial == (2, "postgres")
    assert callable_object == "hello ada"


@test("public_api lists public methods, classmethods and staticmethods by kind, sorted by name")
def _():
    class Base:
        def ping(self):
            return "pong"

        def _internal(self):
            return None

    class Service(Base):
        timeout = 30

        @property
        def status(self):
            return "ok"

        @classmethod
        def build(cls):
            return cls()

        @staticmethod
        def version():
            return "1.0"

        async def fetch(self):
            return 1

        def run(self):
            return 2

        class Error(Exception):
            pass

    api = mod.public_api(Service)
    assert api == [("build", "classmethod"), ("fetch", "method"), ("ping", "method"), ("run", "method"), ("version", "staticmethod")]


@test("is_async recognizes coroutine functions, async methods and partials without calling anything")
def _():
    calls = []

    async def fetch(url):
        calls.append(url)

    def parse(text):
        calls.append(text)

    async def stream():
        calls.append("stream")
        yield 1

    class Client:
        async def get(self):
            calls.append("get")

        def close(self):
            calls.append("close")

    class AsyncHandler:
        async def __call__(self, event):
            calls.append(event)

    candidates = [
        fetch,
        Client().get,
        functools.partial(fetch, "https://example.test"),
        AsyncHandler(),
        parse,
        Client().close,
        stream,
        AsyncHandler,
    ]
    results = [mod.is_async(candidate) for candidate in candidates]
    assert results == [True, True, True, True, False, False, False, False]
    assert calls == []
