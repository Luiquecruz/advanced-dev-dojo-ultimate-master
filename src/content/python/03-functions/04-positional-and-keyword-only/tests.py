@test("connect fills its defaults from a host alone")
def _():
    settings = mod.connect("db")
    assert settings == {"host": "db", "port": 5432, "ssl": True, "timeout": None}
    custom = mod.connect("db", port=5433, timeout=2.5)
    assert custom == {"host": "db", "port": 5433, "ssl": True, "timeout": 2.5}


@test("connect rejects host passed by name")
async def _():
    error = await capture_error(lambda: mod.connect(host="db"))
    assert isinstance(error, TypeError)


# beginner mistake: a flat signature without / and * accepts connect("db", 5433, False), an unreadable flag
@test("connect rejects ssl passed by position")
async def _():
    error = await capture_error(lambda: mod.connect("db", 5433, False))
    assert isinstance(error, TypeError)


@test("describe_signature reports the kind of every parameter of connect")
def _():
    kinds = mod.describe_signature(mod.connect)
    assert kinds == {
        "host": "POSITIONAL_ONLY",
        "port": "POSITIONAL_OR_KEYWORD",
        "ssl": "KEYWORD_ONLY",
        "timeout": "KEYWORD_ONLY",
    }


@test("describe_signature reads any callable in declaration order, including star parameters")
def _():
    def handler(request, /, *routes, verbose=False, **options):
        return request

    kinds = mod.describe_signature(handler)
    names = list(kinds)
    assert names == ["request", "routes", "verbose", "options"]
    assert kinds["routes"] == "VAR_POSITIONAL"
    assert kinds["options"] == "VAR_KEYWORD"
    builtin = mod.describe_signature(divmod)
    assert builtin == {"x": "POSITIONAL_ONLY", "y": "POSITIONAL_ONLY"}
