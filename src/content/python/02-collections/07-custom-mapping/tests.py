from collections.abc import MutableMapping


@test("CaseInsensitiveDict is a MutableMapping and reads any case")
def _():
    headers = mod.CaseInsensitiveDict({"Content-Type": "text/html"})
    assert isinstance(headers, MutableMapping)
    assert headers["content-type"] == "text/html"
    assert headers["CONTENT-TYPE"] == "text/html"


@test("assigning with another case replaces the entry in place and keeps the latest key spelling")
def _():
    headers = mod.CaseInsensitiveDict()
    headers["Accept"] = "a"
    headers["ACCEPT"] = "b"
    assert len(headers) == 1
    assert list(headers) == ["ACCEPT"]
    assert headers["accept"] == "b"
    ordered = mod.CaseInsensitiveDict({"A": 1, "B": 2})
    ordered["a"] = 3
    assert list(ordered) == ["a", "B"]


@test("deleting works with any case and a missing key raises KeyError")
async def _():
    headers = mod.CaseInsensitiveDict({"X-Id": "1"})
    del headers["x-ID"]
    assert len(headers) == 0
    error = await capture_error(lambda: headers["x-id"])
    assert isinstance(error, KeyError)


@test("get, in, pop, setdefault and update are case-insensitive through the ABC")
def _():
    headers = mod.CaseInsensitiveDict({"Accept": "*/*"})
    assert headers.get("ACCEPT") == "*/*"
    assert "accept" in headers
    assert headers.setdefault("ACCEPT", "other") == "*/*"
    headers.update({"accept": "text/plain", "Host": "x"})
    assert len(headers) == 2
    assert headers.pop("HOST") == "x"
    assert headers["Accept"] == "text/plain"


@test("copy returns an independent CaseInsensitiveDict with the same entries")
def _():
    original = mod.CaseInsensitiveDict({"A": 1, "B": 2})
    clone = original.copy()
    assert isinstance(clone, mod.CaseInsensitiveDict)
    assert clone is not original
    clone["c"] = 3
    assert len(original) == 2
    assert dict(clone.items()) == {"A": 1, "B": 2, "c": 3}
