@test("parse_quantity reads whole numbers and rejects other text with a ValueError that names it")
async def _():
    spaced = mod.parse_quantity(" 7 ")
    assert spaced == 7
    zero = mod.parse_quantity("0")
    assert zero == 0
    for text in ["12abc", "1.5", "", "-3"]:
        error = await capture_error(lambda: mod.parse_quantity(text))
        assert isinstance(error, ValueError)
        message = str(error)
        assert text in message


# beginner mistake: catching Exception in safe_ratio, which turns a TypeError from bad input into None
@test("safe_ratio returns None for a zero divisor and lets other errors reach the caller")
async def _():
    ratio = mod.safe_ratio(3, 4)
    assert ratio == 0.75
    none = mod.safe_ratio(3, 0)
    assert none is None
    error = await capture_error(lambda: mod.safe_ratio("3", 4))
    assert isinstance(error, TypeError)


@test("read_port converts the stored value and falls back to 8080 when the key is missing")
def _():
    from_text = mod.read_port({"port": "8000"})
    assert from_text == 8000
    from_number = mod.read_port({"port": 9000, "host": "shop"})
    assert from_number == 9000
    default = mod.read_port({"host": "shop"})
    assert default == 8080


@test("read_port raises a ValueError that mentions the port for a value that is not a number")
async def _():
    for settings in [{"port": "http"}, {"port": None}]:
        error = await capture_error(lambda: mod.read_port(settings))
        assert isinstance(error, ValueError)
        message = str(error)
        assert "port" in message


@test("parse_all keeps going after a bad text and returns the numbers and the rejected texts")
def _():
    values, rejected = mod.parse_all(["3", "two", "-1", " 5 "])
    assert values == [3, 5]
    assert rejected == ["two", "-1"]
    empty = mod.parse_all([])
    assert empty == ([], [])


@test("run_with_log logs the end even when the action raises, and the error still reaches the caller")
async def _():
    log = []
    result = mod.run_with_log(lambda: "saved", log)
    assert result == "saved"
    assert log == ["start", "end"]

    def broken():
        raise KeyError("missing")

    failed = []
    error = await capture_error(lambda: mod.run_with_log(broken, failed))
    assert isinstance(error, KeyError)
    assert failed == ["start", "end"]
