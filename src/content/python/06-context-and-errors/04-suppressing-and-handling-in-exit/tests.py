class StaleCache(KeyError):
    pass


class Shutdown(BaseException):
    """Stands in for KeyboardInterrupt or SystemExit without stopping the test run."""


class Recorder:
    def __init__(self):
        self.calls = []

    def returning(self, name, value):
        def call():
            self.calls.append(name)
            return value

        return call

    def raising(self, name, error):
        def call():
            self.calls.append(name)
            raise error

        return call


@test("Suppress swallows the listed types and their subclasses, and execution continues after the block")
def _():
    reached = []
    with mod.Suppress(KeyError, ValueError):
        raise StaleCache("price:42")
    reached.append("after KeyError subclass")
    with mod.Suppress(LookupError):
        [][1]
    reached.append("after IndexError")
    with mod.Suppress(KeyError):
        reached.append("no error")
    assert reached == ["after KeyError subclass", "after IndexError", "no error"]


@test("exceptions outside the declared types propagate unchanged")
async def _():
    raised = ValueError("bad quantity")

    def suppress_other():
        with mod.Suppress(KeyError):
            raise raised

    def collect_other():
        with mod.ErrorCollector(KeyError):
            raise raised

    def suppress_nothing():
        with mod.Suppress():
            raise raised

    for action in (suppress_other, collect_other, suppress_nothing):
        error = await capture_error(action)
        assert error is raised


@test("ErrorCollector keeps the matching errors in order across several blocks")
def _():
    collector = mod.ErrorCollector(LookupError, ValueError)
    first = KeyError("sku")
    second = ValueError("quantity")
    with collector as entered:
        raise first
    with collector:
        pass
    with collector:
        raise second
    assert entered is collector
    assert collector.errors == [first, second]


@test("run_all returns the results of the calls that succeeded and the errors of the calls that failed")
def _():
    recorder = Recorder()
    timeout = TimeoutError("inventory service")
    missing = KeyError("sku-9")
    results, errors = mod.run_all([
        recorder.returning("a", 1),
        recorder.raising("b", timeout),
        recorder.returning("c", 3),
        recorder.raising("d", missing),
    ])
    assert recorder.calls == ["a", "b", "c", "d"]
    assert results == [1, 3]
    assert errors == [timeout, missing]


@test("an exception that is not an Exception subclass is never collected and stops run_all")
def _():
    recorder = Recorder()
    collector = mod.ErrorCollector(Exception)
    escaped = []
    try:
        with collector:
            raise Shutdown()
    except BaseException as error:
        escaped.append(type(error).__name__)
    try:
        mod.run_all([recorder.returning("a", 1), recorder.raising("b", Shutdown()), recorder.returning("c", 3)])
    except BaseException as error:
        escaped.append(type(error).__name__)
    assert collector.errors == []
    assert escaped == ["Shutdown", "Shutdown"]
    assert recorder.calls == ["a", "b"]
