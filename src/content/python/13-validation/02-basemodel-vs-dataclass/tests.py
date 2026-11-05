from pydantic import BaseModel, ValidationError


def error_pairs(error):
    return sorted((tuple(item["loc"]), item["type"]) for item in error.errors())


# beginner mistake: keeping User a dataclass, which stores "42" as a string instead of parsing it
@test("User is a Pydantic model and parse_user coerces a numeric string to int")
def _():
    is_model = issubclass(mod.User, BaseModel)
    user = mod.parse_user({"id": "42", "email": "ada@example.com"})
    id_type = type(user.id).__name__
    assert is_model
    assert isinstance(user, mod.User)
    assert user.id == 42
    assert id_type == "int"
    assert user.email == "ada@example.com"
    assert user.tags == []


@test("invalid input raises one ValidationError that locates every bad field")
async def _():
    error = await capture_error(lambda: mod.parse_user({"id": "forty-two", "tags": ["ops", 3]}))
    assert isinstance(error, ValidationError)
    pairs = error_pairs(error)
    count = error.error_count()
    assert pairs == [(("email",), "missing"), (("id",), "int_parsing"), (("tags", 1), "string_type")]
    assert count == 3


@test("an unknown field is reported as an error instead of being dropped")
async def _():
    error = await capture_error(lambda: mod.parse_user({"id": 7, "email": "eve@example.com", "is_admin": True}))
    assert isinstance(error, ValidationError)
    pairs = error_pairs(error)
    assert pairs == [(("is_admin",), "extra_forbidden")]


@test("every user gets its own tags list")
def _():
    first = mod.parse_user({"id": 1, "email": "a@example.com"})
    second = mod.parse_user({"id": 2, "email": "b@example.com"})
    direct = mod.User(id=3, email="c@example.com")
    first.tags.append("beta")
    assert first.tags == ["beta"]
    assert second.tags == []
    assert direct.tags == []


@test("to_public returns a new dict without the email and leaves the user intact")
def _():
    user = mod.parse_user({"id": "7", "email": "grace@example.com", "tags": ["ops"]})
    public = mod.to_public(user)
    kind = type(public).__name__
    public["tags"].append("leaked")
    assert kind == "dict"
    assert public == {"id": 7, "tags": ["ops", "leaked"]}
    assert user.email == "grace@example.com"
    assert user.tags == ["ops"]
