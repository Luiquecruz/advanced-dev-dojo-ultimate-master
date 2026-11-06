class Resource:
    def __init__(self, name, log, fail_open=False, fail_close=False):
        self.name = name
        self.log = log
        self.fail_open = fail_open
        self.fail_close = fail_close

    def __enter__(self):
        if self.fail_open:
            self.log.append(f"fail {self.name}")
            raise ConnectionError(f"cannot open {self.name}")
        self.log.append(f"open {self.name}")
        return self.name.upper()

    def __exit__(self, exc_type, exc, traceback):
        self.log.append(f"close {self.name}")
        if self.fail_close:
            raise OSError(f"cannot close {self.name}")
        return False


def opener(name, log, **failures):
    return lambda: Resource(name, log, **failures)


def openers(log, *names, **failures):
    return [opener(name, log, **failures.get(name, {})) for name in names]


# beginner mistake: open_all closes the resources in a forward loop, in opening order, instead of unwinding an ExitStack
@test("open_all yields every entered value in order and closes everything in reverse order after the block")
def _():
    log = []
    with mod.open_all(openers(log, "db", "broker", "export")) as values:
        log.append("work")
    assert values == ["DB", "BROKER", "EXPORT"]
    assert log == ["open db", "open broker", "open export", "work", "close export", "close broker", "close db"]


@test("when a later resource fails to open, the ones already opened are closed in reverse order")
async def _():
    log = []
    failing = openers(log, "db", "broker", "export", "audit", export={"fail_open": True})

    def enter():
        with mod.open_all(failing):
            log.append("work")

    error = await capture_error(enter)
    assert isinstance(error, ConnectionError)
    assert log == ["open db", "open broker", "fail export", "close broker", "close db"]


@test("a resource that fails to close does not stop the others from closing")
async def _():
    log = []
    resources = openers(log, "db", "broker", "export", broker={"fail_close": True})

    def use():
        with mod.open_all(resources):
            log.append("work")

    error = await capture_error(use)
    assert isinstance(error, OSError)
    assert log == ["open db", "open broker", "open export", "work", "close export", "close broker", "close db"]


@test("ResourcePool keeps its resources open after construction and closes them in reverse order on close()")
def _():
    log = []
    pool = mod.ResourcePool(openers(log, "db", "broker", "export"))
    after_init = list(log)
    resources = pool.resources
    pool.close()
    after_close = list(log)
    pool.close()
    assert after_init == ["open db", "open broker", "open export"]
    assert resources == ["DB", "BROKER", "EXPORT"]
    assert after_close == after_init + ["close export", "close broker", "close db"]
    assert log == after_close


@test("ResourcePool cleans up when construction fails, and closes itself when used in a with block")
async def _():
    log = []
    error = await capture_error(lambda: mod.ResourcePool(openers(log, "db", "broker", "export", broker={"fail_open": True})))
    failed = list(log)
    log.clear()
    with mod.ResourcePool(openers(log, "db", "export")) as pool:
        held = list(pool.resources)
        log.append("work")
    assert isinstance(error, ConnectionError)
    assert failed == ["open db", "fail broker", "close db"]
    assert held == ["DB", "EXPORT"]
    assert log == ["open db", "open export", "work", "close export", "close db"]
