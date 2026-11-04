@test("decode_lenient decodes valid UTF-8 and falls back to the next encoding")
def _():
    assert mod.decode_lenient("café".encode("utf-8")) == "café"
    assert mod.decode_lenient(b"caf\xe9") == "café"


@test("decode_lenient raises ValueError when no encoding works")
async def _():
    error = await capture_error(lambda: mod.decode_lenient(b"\xff", ("utf-8", "ascii")))
    assert isinstance(error, ValueError)


@test("truncate_utf8 cuts by bytes without splitting a character")
def _():
    assert mod.truncate_utf8("añb", 2) == "a"
    assert mod.truncate_utf8("añb", 3) == "añ"
    assert mod.truncate_utf8("a😀", 4) == "a"
    assert mod.truncate_utf8("a😀", 5) == "a😀"
    assert isinstance(mod.truncate_utf8("abc", 2), str)


@test("normalize_key ignores composition and case, including the German sharp s")
def _():
    assert mod.normalize_key("É") == mod.normalize_key("É")
    assert mod.normalize_key("STRASSE") == mod.normalize_key("straße")
    assert mod.normalize_key("Ab") != mod.normalize_key("Ac")


@test("money_row aligns the label and the amount with a format spec")
def _():
    assert mod.money_row("Coffee", 450) == "Coffee" + " " * 8 + "4.50"
    assert mod.money_row("Tea", 1234) == "Tea" + " " * 10 + "12.34"
