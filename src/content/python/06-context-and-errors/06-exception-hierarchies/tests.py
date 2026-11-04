DOMAIN_ERRORS = ("ValidationError", "NotFoundError", "ConflictError")


@test("every domain error derives from AppError, AppError is an Exception, and the standard families still match")
def _():
    under_app_error = {name: issubclass(getattr(mod, name), mod.AppError) for name in DOMAIN_ERRORS}
    caught = []
    for error in (mod.ValidationError("bad"), mod.NotFoundError("gone"), mod.ConflictError("taken")):
        try:
            raise error
        except mod.NotFoundError:
            caught.append("not found")
        except mod.AppError:
            caught.append("app error")
        except Exception:
            caught.append("escaped")
    families = [
        issubclass(mod.AppError, Exception),
        issubclass(mod.ValidationError, ValueError),
        issubclass(mod.NotFoundError, LookupError),
    ]
    assert under_app_error == {name: True for name in DOMAIN_ERRORS}
    assert caught == ["app error", "not found", "app error"]
    assert families == [True, True, True]


@test("exit_status returns the status of the nearest class that defines one")
def _():
    class EmailTaken(mod.ConflictError):
        pass

    class Gone(mod.NotFoundError):
        status = 410

    class PaymentRequired(mod.AppError):
        pass

    statuses = [
        mod.exit_status(mod.ValidationError("x")),
        mod.exit_status(mod.NotFoundError("x")),
        mod.exit_status(mod.ConflictError("x")),
        mod.exit_status(EmailTaken("x")),
        mod.exit_status(Gone("x")),
        mod.exit_status(PaymentRequired("x")),
        mod.exit_status(KeyError("x")),
    ]
    assert statuses == [400, 404, 409, 409, 410, 500, 500]


@test("parse_age accepts whole numbers in range and raises ValidationError for anything else, without echoing the input")
async def _():
    accepted = [mod.parse_age("42"), mod.parse_age(" 7 "), mod.parse_age("0"), mod.parse_age("150")]
    assert accepted == [42, 7, 0, 150]
    for text in ("forty-two", "4.5", "", "-3", "999"):
        error = await capture_error(lambda: mod.parse_age(text))
        kind = type(error).__name__
        message = str(error)
        echoed = bool(text) and text in message
        assert kind == "ValidationError"
        assert isinstance(error, ValueError)
        assert "age" in message
        assert not echoed


@test("respond turns results and domain errors into (status, body) pairs")
def _():
    def missing():
        raise mod.NotFoundError("order 7 not found")

    def duplicate():
        raise mod.ConflictError("order 7 already captured")

    ok = mod.respond(lambda: {"order": 7})
    not_found = mod.respond(missing)
    conflict = mod.respond(duplicate)
    invalid = mod.respond(lambda: mod.parse_age("old"))
    assert ok == (200, {"order": 7})
    assert not_found == (404, "order 7 not found")
    assert conflict == (409, "order 7 already captured")
    assert invalid[0] == 400


@test("respond lets errors that are not AppErrors propagate unchanged")
async def _():
    bug = KeyError("customer_id")
    crash = ZeroDivisionError("division by zero")

    def lookup():
        raise bug

    def divide():
        raise crash

    first = await capture_error(lambda: mod.respond(lookup))
    second = await capture_error(lambda: mod.respond(divide))
    assert first is bug
    assert second is crash
