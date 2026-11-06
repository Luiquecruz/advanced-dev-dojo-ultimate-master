import ast


class FakeClock:
    def __init__(self):
        self.now = 0.0

    def __call__(self):
        return self.now


class FakeTokens:
    def __init__(self, token="t1"):
        self.token = token
        self.refreshes = 0

    def current(self):
        return self.token

    def refresh(self):
        self.refreshes += 1
        self.token = f"t{self.refreshes + 1}"
        return self.token


class FakeApi:
    """Records each inner call; each call takes one second on the fake clock."""

    def __init__(self, clock, connection_failures=0, expired_tokens=()):
        self.clock = clock
        self.connection_failures = connection_failures
        self.expired_tokens = set(expired_tokens)
        self.calls = []

    def fetch(self, path, *, token):
        """Fetch one resource."""
        self.calls.append((path, token))
        self.clock.now += 1.0
        if token in self.expired_tokens:
            raise mod.AuthExpired(token)
        if len(self.calls) <= self.connection_failures:
            raise ConnectionError(f"attempt {len(self.calls)}")
        return {"path": path, "token": token}


def make_client(**api_options):
    clock = FakeClock()
    api = FakeApi(clock, **api_options)
    store, metrics, tokens = {}, [], FakeTokens()
    client = mod.build_client(api.fetch, store=store, metrics=metrics, tokens=tokens, clock=clock)
    return client, api, store, metrics, tokens


def module_level_containers(text):
    found = []
    for node in ast.parse(text).body:
        if isinstance(node, (ast.Assign, ast.AnnAssign)) and node.value is not None:
            value = node.value
            is_display = isinstance(value, (ast.List, ast.Dict, ast.Set))
            is_factory = isinstance(value, ast.Call) and isinstance(value.func, ast.Name) and value.func.id in {"list", "dict", "set", "deque", "defaultdict"}
            if is_display or is_factory:
                targets = node.targets if isinstance(node, ast.Assign) else [node.target]
                found.extend(target.id for target in targets if isinstance(target, ast.Name))
    return found


# beginner mistake: applying the layers in listed order makes cached the innermost layer, so a hit still runs the others
@test("a cache hit skips every inner layer")
def _():
    client, api, store, metrics, tokens = make_client()
    first = client("/orders")
    second = client("/orders")
    assert first == {"path": "/orders", "token": "t1"}
    assert second == first
    assert len(api.calls) == 1
    assert len(metrics) == 1
    assert len(store) == 1


@test("two connection failures then a success make three inner calls and one metrics sample")
def _():
    client, api, store, metrics, tokens = make_client(connection_failures=2)
    result = client("/orders")
    assert result["path"] == "/orders"
    assert len(api.calls) == 3
    assert metrics == [{"name": "fetch", "elapsed": 3.0, "ok": True}]


@test("an expired token is refreshed exactly once and a second expiry is not retried")
async def _():
    client, api, store, metrics, tokens = make_client(expired_tokens={"t1"})
    result = client("/orders")
    assert result["token"] == "t2"
    assert api.calls == [("/orders", "t1"), ("/orders", "t2")]
    assert tokens.refreshes == 1
    stuck, stuck_api, _, stuck_metrics, stuck_tokens = make_client(expired_tokens={"t1", "t2", "t3"})
    error = await capture_error(lambda: stuck("/orders"))
    assert isinstance(error, mod.AuthExpired)
    assert stuck_tokens.refreshes == 1
    assert len(stuck_api.calls) == 2
    assert stuck_metrics[-1]["ok"] is False


@test("the client keeps the call's name and a __wrapped__ chain down to the original call")
def _():
    clock = FakeClock()
    api = FakeApi(clock)
    client = mod.build_client(api.fetch, store={}, metrics=[], tokens=FakeTokens(), clock=clock)
    name = client.__name__
    doc = client.__doc__
    layer, depth = client, 0
    while hasattr(layer, "__wrapped__"):
        layer, depth = layer.__wrapped__, depth + 1
    assert name == "fetch"
    assert doc == "Fetch one resource."
    assert depth == 4
    assert layer == api.fetch


@test("two clients built side by side share no state")
def _():
    client_a, api_a, store_a, metrics_a, _ = make_client()
    client_b, api_b, store_b, metrics_b, _ = make_client()
    client_a("/orders")
    client_b("/orders")
    assert len(api_a.calls) == 1
    assert len(api_b.calls) == 1
    assert len(store_a) == 1
    assert len(store_b) == 1
    assert len(metrics_a) == 1
    assert len(metrics_b) == 1
    shared = module_level_containers(source)
    assert shared == []
