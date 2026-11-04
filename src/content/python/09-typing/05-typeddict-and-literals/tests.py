from typing import Literal, Required, TypedDict, get_type_hints


class Event(TypedDict, total=False):
    kind: Required[Literal["click", "view"]]
    count: int
    labels: list[str]


class Measurement(TypedDict):
    ratio: float


@test("UserPayload declares its required, optional and read-only keys as contracted")
def _():
    schema = mod.UserPayload
    required = schema.__required_keys__
    optional = schema.__optional_keys__
    readonly = getattr(schema, "__readonly_keys__", None)
    hints = get_type_hints(schema)
    assert required == frozenset({"id", "name", "role"})
    assert optional == frozenset({"tags"})
    assert readonly == frozenset({"id"})
    assert hints == {"id": int, "name": str, "role": Literal["admin", "editor", "viewer"], "tags": list[str]}


@test("a valid payload produces no errors, with or without its optional keys")
def _():
    full = {"id": 7, "name": "ada", "role": "admin", "tags": ["ops", "beta"]}
    minimal = {"id": 8, "name": "alan", "role": "viewer"}
    full_errors = mod.validate_payload(full, mod.UserPayload)
    minimal_errors = mod.validate_payload(minimal, mod.UserPayload)
    assert full_errors == []
    assert minimal_errors == []


@test("missing required keys are reported in declaration order")
def _():
    nothing = mod.validate_payload({}, mod.UserPayload)
    no_name = mod.validate_payload({"id": 1, "role": "editor"}, mod.UserPayload)
    assert nothing == ["id: missing", "name: missing", "role: missing"]
    assert no_name == ["name: missing"]


@test("values of the wrong type or outside the literal choices are reported")
def _():
    payload = {"id": True, "name": "ada", "role": "owner", "tags": ["ops", 3]}
    errors = mod.validate_payload(payload, mod.UserPayload)
    text_id = mod.validate_payload({"id": "7", "name": "ada", "role": "viewer"}, mod.UserPayload)
    assert errors == ["id: wrong type", "role: not allowed", "tags: wrong type"]
    assert text_id == ["id: wrong type"]


@test("unknown keys are reported last, and the rules come from the TypedDict passed in")
def _():
    extra = mod.validate_payload({"kind": "click", "count": 2, "source": "ad"}, Event)
    no_kind = mod.validate_payload({"count": 1}, Event)
    only_kind = mod.validate_payload({"kind": "view"}, Event)
    bad_label = mod.validate_payload({"labels": "promo", "kind": "tap"}, Event)
    assert extra == ["source: unknown key"]
    assert no_kind == ["kind: missing"]
    assert only_kind == []
    assert bad_label == ["kind: not allowed", "labels: wrong type"]


@test("an annotation outside the supported set raises TypeError")
async def _():
    error = await capture_error(lambda: mod.validate_payload({"ratio": 0.5}, Measurement))
    assert isinstance(error, TypeError)
