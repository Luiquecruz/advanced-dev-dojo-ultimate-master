class FakeClock:
    def __init__(self, *readings):
        self.readings = list(readings)

    def __call__(self):
        return self.readings.pop(0)


class FakeStore:
    def __init__(self, name, log):
        self.name = name
        self.log = log

    def begin(self):
        self.log.append(f"begin {self.name}")

    def commit(self):
        self.log.append(f"commit {self.name}")

    def rollback(self):
        self.log.append(f"rollback {self.name}")


class PaymentDeclined(Exception):
    pass


# beginner mistake: Timer.__enter__ has no return statement, so the as target is None
@test("the as target is the Timer itself and elapsed comes from the injected clock")
def _():
    manager = mod.Timer(FakeClock(100.0, 103.5))
    before = manager.elapsed
    with manager as timer:
        inside = timer
    elapsed = manager.elapsed
    assert before is None
    assert inside is manager
    assert elapsed == 3.5


@test("Timer records the elapsed time when the block raises, and the exception still propagates")
def _():
    manager = mod.Timer(FakeClock(10.0, 12.0))
    error = None
    try:
        with manager:
            raise PaymentDeclined("card expired")
    except PaymentDeclined as caught:
        error = caught
    elapsed = manager.elapsed
    assert isinstance(error, PaymentDeclined)
    assert elapsed == 2.0


@test("Transaction begins on enter and commits once when the block succeeds")
def _():
    log = []
    manager = mod.Transaction(FakeStore("orders", log))
    with manager as transaction:
        inside = transaction
        log.append("body")
    assert inside is manager
    assert log == ["begin orders", "body", "commit orders"]
    assert manager.error is None


@test("a failing block is rolled back, not committed, and __exit__ keeps the exception it received")
def _():
    log = []
    manager = mod.Transaction(FakeStore("orders", log))
    raised = PaymentDeclined("insufficient funds")
    propagated = None
    try:
        with manager:
            raise raised
    except PaymentDeclined as caught:
        propagated = caught
    assert log == ["begin orders", "rollback orders"]
    assert manager.error is raised
    assert propagated is raised


@test("with several managers in one statement, the last one entered exits first")
def _():
    log = []
    error = None
    try:
        with mod.Transaction(FakeStore("orders", log)), mod.Transaction(FakeStore("ledger", log)):
            log.append("body")
            raise PaymentDeclined("limit reached")
    except PaymentDeclined as caught:
        error = caught
    assert isinstance(error, PaymentDeclined)
    assert log == ["begin orders", "begin ledger", "body", "rollback ledger", "rollback orders"]
