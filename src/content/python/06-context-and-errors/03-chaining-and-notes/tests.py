import json
import traceback


@test("load_config returns the parsed object and rejects JSON that is not an object")
async def _():
    config = mod.load_config('{"region": "eu", "retries": 3}')
    assert config == {"region": "eu", "retries": 3}
    error = await capture_error(lambda: mod.load_config("[1, 2, 3]"))
    kind = type(error).__name__
    assert kind == "ConfigError"


@test("invalid JSON raises ConfigError whose explicit cause is the original decode error")
async def _():
    error = await capture_error(lambda: mod.load_config('{"region": "eu",}'))
    kind = type(error).__name__
    cause = error.__cause__
    assert kind == "ConfigError"
    assert isinstance(cause, json.JSONDecodeError)
    assert error.__context__ is cause
    assert error.__suppress_context__ is True
    assert "line" in str(error)


@test("reraise_hidden turns a KeyError into ConfigError and hides it from the traceback")
async def _():
    @mod.reraise_hidden
    def database_url(settings):
        """Read the database URL."""
        return settings["database_url"]

    value = database_url({"database_url": "postgres://db/orders"})
    name = database_url.__name__
    error = await capture_error(lambda: database_url({}))
    kind = type(error).__name__
    printed = "".join(traceback.format_exception(error))
    assert value == "postgres://db/orders"
    assert name == "database_url"
    assert kind == "ConfigError"
    assert "database_url" in str(error)
    assert error.__cause__ is None
    assert error.__suppress_context__ is True
    assert isinstance(error.__context__, KeyError)
    assert "During handling" not in printed


@test("reraise_hidden lets exceptions other than KeyError pass through unchanged")
async def _():
    broken = TypeError("settings must be a mapping")

    @mod.reraise_hidden
    def read(settings):
        raise broken

    error = await capture_error(lambda: read(None))
    assert error is broken


@test("annotate adds one note per keyword in sorted key order and returns the same exception")
def _():
    error = ValueError("capture failed")
    returned = mod.annotate(error, region="eu", order_id=7)
    again = mod.annotate(error, attempt=2)
    notes = getattr(error, "__notes__", [])
    assert returned is error
    assert again is error
    assert notes == ["order_id=7", "region=eu", "attempt=2"]


@test("annotate keeps the message and args and the notes show up in the formatted traceback")
def _():
    error = KeyError("sku-9")
    mod.annotate(error, order_id=7)
    message = str(error)
    args = error.args
    printed = "".join(traceback.format_exception(error))
    assert message == "'sku-9'"
    assert args == ("sku-9",)
    assert "order_id=7" in printed
