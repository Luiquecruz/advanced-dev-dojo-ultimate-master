class Recorder:
    def __init__(self, result=None, failures=0):
        self.calls = []
        self.result = result
        self.failures = failures

    def __call__(self, *args, **kwargs):
        self.calls.append((args, kwargs))
        if len(self.calls) <= self.failures:
            raise RuntimeError("not ready")
        return self.result


# beginner mistake: lambdas built in a loop read the loop variable at call time, so every handler sees the last name
@test("each handler greets its own name")
def _():
    handlers = mod.make_handlers(["ada", "linus", "grace"])
    greetings = [handler() for handler in handlers]
    assert greetings == ["hello ada", "hello linus", "hello grace"]


@test("each multiplier keeps its own factor, also when factors come from a generator")
def _():
    double, triple = mod.make_multipliers([2, 3])
    assert double(10) == 20
    assert triple(10) == 30
    from_generator = mod.make_multipliers(factor for factor in (5, 7))
    results = [multiplier(1) for multiplier in from_generator]
    assert results == [5, 7]


@test("once runs the function a single time and the first call's arguments win")
def _():
    def connect(host, *, port=5432):
        recorder.calls.append((host, port))
        return f"{host}:{port}"

    recorder = Recorder()
    connect_once = mod.once(connect)
    first = connect_once("db1", port=6000)
    second = connect_once("db2")
    assert first == "db1:6000"
    assert second == "db1:6000"
    assert recorder.calls == [("db1", 6000)]


@test("once caches a None result and keeps separate wrappers independent")
def _():
    load = Recorder()
    load_once = mod.once(load)
    load_once()
    load_once()
    assert len(load.calls) == 1
    other = Recorder(result="other")
    other_once = mod.once(other)
    value = other_once()
    assert value == "other"
    assert len(other.calls) == 1


@test("once does not cache an exception, so a failed first call runs again")
async def _():
    flaky = Recorder(result="ready", failures=1)
    flaky_once = mod.once(flaky)
    error = await capture_error(lambda: flaky_once())
    assert isinstance(error, RuntimeError)
    value = flaky_once()
    again = flaky_once()
    assert value == "ready"
    assert again == "ready"
    assert len(flaky.calls) == 2
