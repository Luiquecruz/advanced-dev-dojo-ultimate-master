ROLES = {
    "viewer": {"read"},
    "editor": {"read", "write"},
    "admin": {"read", "write", "delete"},
}


@test("access_report computes granted, common, missing and unused permissions")
def _():
    report = mod.access_report(ROLES, ["viewer", "editor"], {"read", "delete"})
    assert report["granted"] == {"read", "write"}
    assert report["common"] == {"read"}
    assert report["missing"] == {"delete"}
    assert report["unused"] == {"write"}


@test("access_report with no roles grants nothing and reports everything as missing")
def _():
    report = mod.access_report(ROLES, [], {"read"})
    assert report["granted"] == set()
    assert report["common"] == set()
    assert report["missing"] == {"read"}
    assert report["unused"] == set()


@test("access_report returns new sets and never modifies or exposes the input roles")
def _():
    snapshot = {name: set(permissions) for name, permissions in ROLES.items()}
    report = mod.access_report(ROLES, ["editor", "admin"], set())
    kinds = [type(value).__name__ for value in report.values()]
    assert kinds == ["set", "set", "set", "set"]
    assert ROLES == snapshot
    single = mod.access_report(ROLES, ["viewer"], set())
    single["granted"].add("hack")
    single["common"].add("hack")
    assert ROLES["viewer"] == {"read"}


@test("access_report raises KeyError for an unknown role")
async def _():
    error = await capture_error(lambda: mod.access_report(ROLES, ["ghost"], set()))
    assert isinstance(error, KeyError)


@test("dedupe_keep_order keeps the first occurrence and rejects unhashable items")
async def _():
    result = mod.dedupe_keep_order(["b", "a", "b", "c", "a"])
    assert result == ["b", "a", "c"]
    error = await capture_error(lambda: mod.dedupe_keep_order([[1], [1]]))
    assert isinstance(error, TypeError)


@test("unique_ids merges every iterable, including generators, into one set")
def _():
    result = mod.unique_ids([1, 2], (2, 3), (n for n in [3, 4]))
    assert result == {1, 2, 3, 4}
    assert isinstance(result, set)
