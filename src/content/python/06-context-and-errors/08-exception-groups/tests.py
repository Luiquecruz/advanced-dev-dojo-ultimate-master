class OutOfRange(ValueError):
    pass


class Shutdown(BaseException):
    """Stands in for KeyboardInterrupt or SystemExit without stopping the test run."""


def flatten(group):
    found = []
    for error in group.exceptions:
        if isinstance(error, BaseExceptionGroup):
            found.extend(flatten(error))
        else:
            found.append(error)
    return found


def rule_raising(calls, name, error=None):
    def rule(record):
        calls.append(name)
        if error is not None:
            raise error

    return rule


def sample_group():
    return ExceptionGroup("validation failed", [
        ValueError("amount"),
        TypeError("currency"),
        ExceptionGroup("address", [ValueError("zip"), OutOfRange("country"), KeyError("street")]),
        TypeError("card"),
    ])


@test("validate_all runs every rule and raises one ExceptionGroup with every failure in rule order")
async def _():
    calls = []
    amount = ValueError("amount must be positive")
    currency = ValueError("currency must be an ISO code")
    card = KeyError("card")
    rules = [
        rule_raising(calls, "amount", amount),
        rule_raising(calls, "merchant"),
        rule_raising(calls, "currency", currency),
        rule_raising(calls, "card", card),
    ]
    error = await capture_error(lambda: mod.validate_all({"amount": -5}, rules))
    kind = type(error).__name__
    assert kind == "ExceptionGroup"
    assert error.message == "validation failed"
    assert list(error.exceptions) == [amount, currency, card]
    assert calls == ["amount", "merchant", "currency", "card"]


@test("validate_all returns normally when every rule passes or there are no rules")
def _():
    calls = []
    rules = [rule_raising(calls, "amount"), rule_raising(calls, "currency")]
    result = mod.validate_all({"amount": 10}, rules)
    empty = mod.validate_all({"amount": 10}, [])
    assert result is None
    assert empty is None
    assert calls == ["amount", "currency"]


@test("handle counts each handled type separately, including nested groups and subclasses")
def _():
    group = ExceptionGroup("validation failed", [
        ValueError("amount"),
        TypeError("currency"),
        ExceptionGroup("address", [ValueError("zip"), OutOfRange("country")]),
        TypeError("card"),
    ])
    counts = mod.handle(group)
    only_values = mod.handle(ExceptionGroup("validation failed", [OutOfRange("amount")]))
    assert counts == {"ValueError": 3, "TypeError": 2}
    assert only_values == {"ValueError": 1, "TypeError": 0}


@test("handle re-raises the exceptions it does not handle as an exception group")
async def _():
    error = await capture_error(lambda: mod.handle(sample_group()))
    is_group = isinstance(error, ExceptionGroup)
    remaining = [type(member).__name__ for member in flatten(error)] if is_group else []
    assert is_group
    assert error.message == "validation failed"
    assert remaining == ["KeyError"]


@test("only keeps the matching exceptions with the group's message and nesting, or returns None")
def _():
    group = sample_group()
    values = mod.only(group, ValueError)
    missing = mod.only(group, OSError)
    names = [str(member) for member in flatten(values)]
    nested = [isinstance(member, ExceptionGroup) for member in values.exceptions]
    assert values.message == "validation failed"
    assert names == ["amount", "zip", "country"]
    assert nested == [False, True]
    assert missing is None


@test("validate_all lets an exception that is not an Exception subclass stop the run unchanged")
def _():
    calls = []
    stop = Shutdown()
    rules = [
        rule_raising(calls, "amount", ValueError("amount must be positive")),
        rule_raising(calls, "cancel", stop),
        rule_raising(calls, "card"),
    ]
    escaped = None
    try:
        mod.validate_all({"amount": -5}, rules)
    except BaseException as error:
        escaped = error
    assert escaped is stop
    assert calls == ["amount", "cancel"]
