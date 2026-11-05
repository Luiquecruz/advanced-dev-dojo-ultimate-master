import json

from pydantic import ValidationError

GOOD = {
    "username": "ada_l",
    "email": "  Ada@Example.COM ",
    "age": 36,
    "password": "correct horse battery",
    "password_confirm": "correct horse battery",
}


def error_pairs(error):
    return sorted((tuple(item["loc"]), item["type"]) for item in error.errors())


async def rejection(data):
    error = await capture_error(lambda: mod.Signup.model_validate(data))
    assert isinstance(error, ValidationError), type(error).__name__
    return error


@test("a valid signup is accepted with its email stripped and lowercased")
def _():
    signup = mod.Signup.model_validate(GOOD)
    plain = mod.Signup.model_validate({**GOOD, "email": "grace@navy.mil"})
    assert signup.email == "ada@example.com"
    assert signup.username == "ada_l"
    assert signup.age == 36
    assert plain.email == "grace@navy.mil"


@test("constraint violations are reported per field, and the password check waits for valid fields")
async def _():
    error = await rejection({**GOOD, "username": "Al", "email": "nobody", "age": 12, "password": "short", "password_confirm": "other"})
    pairs = error_pairs(error)
    assert pairs == [
        (("age",), "greater_than_equal"),
        (("email",), "value_error"),
        (("password",), "string_too_short"),
        (("username",), "string_pattern_mismatch"),
    ]
    old = await rejection({**GOOD, "age": 131})
    old_pairs = error_pairs(old)
    no_domain = await rejection({**GOOD, "email": "ada@localhost"})
    domain_pairs = error_pairs(no_domain)
    assert old_pairs == [(("age",), "less_than_equal")]
    assert domain_pairs == [(("email",), "value_error")]


@test("mismatched passwords produce one model-level error that names both fields")
async def _():
    error = await rejection({**GOOD, "password_confirm": "correct horse battery!"})
    pairs = error_pairs(error)
    fields = tuple(error.errors()[0].get("ctx", {}).get("fields", ()))
    assert pairs == [((), "password_mismatch")]
    assert fields == ("password", "password_confirm")


@test("a legacy e_mail key is accepted without mutating the payload or overriding email")
async def _():
    legacy = {key: value for key, value in GOOD.items() if key != "email"} | {"e_mail": " Grace@Navy.MIL"}
    signup = mod.Signup.model_validate(legacy)
    keys = sorted(legacy)
    assert signup.email == "grace@navy.mil"
    assert keys == ["age", "e_mail", "password", "password_confirm", "username"]
    both = await rejection({**GOOD, "e_mail": "other@example.com"})
    both_pairs = error_pairs(both)
    assert both_pairs == [(("e_mail",), "extra_forbidden")]
    not_a_dict = await rejection(["ada_l", "ada@example.com"])
    shape_pairs = error_pairs(not_a_dict)
    assert shape_pairs == [((), "model_type")]


# beginner mistake: returning error.errors() unchanged, which echoes the rejected password in each "input" field
@test("signup_errors returns structured errors without echoing rejected input")
def _():
    valid = mod.signup_errors(GOOD)
    weak = mod.signup_errors({**GOOD, "email": "nobody", "password": "hunter2", "password_confirm": "hunter2"})
    mismatch = mod.signup_errors({**GOOD, "password_confirm": "correct horse battery!"})
    weak_pairs = sorted((tuple(item["loc"]), item["type"]) for item in weak)
    mismatch_pairs = [(tuple(item["loc"]), item["type"]) for item in mismatch]
    leaked_keys = [item for item in weak + mismatch if "input" in item]
    text = json.dumps(weak + mismatch)
    assert valid == []
    assert weak_pairs == [(("email",), "value_error"), (("password",), "string_too_short")]
    assert mismatch_pairs == [((), "password_mismatch")]
    assert leaked_keys == []
    assert "hunter2" not in text
    assert "battery" not in text
    assert "nobody" not in text
