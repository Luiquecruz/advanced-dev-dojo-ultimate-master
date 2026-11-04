from dataclasses import dataclass, field

STRING = {"type": "string"}
INTEGER = {"type": "integer"}
NULL = {"type": "null"}
LINE = {
    "title": "Line",
    "type": "object",
    "properties": {"sku": STRING, "quantity": INTEGER, "price": {"type": "number"}},
    "required": ["sku", "quantity", "price"],
}
CUSTOMER = {
    "title": "Customer",
    "type": "object",
    "properties": {"name": STRING, "email": {"anyOf": [STRING, NULL]}},
    "required": ["name", "email"],
}


@dataclass
class Settings:
    retries: int = 3
    tags: list[str] = field(default_factory=list)
    proxy: str | None = None


@dataclass
class Scores:
    values: dict[str, int]


@dataclass
class Either:
    value: int | str


class Draft:
    owner: Undefined
    reviewers: list[Reviewer] | None


@test("build_schema maps str, int and float fields and marks fields without a default as required")
def _():
    schema = mod.build_schema(mod.Line)
    assert schema == LINE


@test("fields with a default or a default factory are not required, and X | None also accepts null")
def _():
    customer = mod.build_schema(mod.Customer)
    settings = mod.build_schema(Settings)
    assert customer == CUSTOMER
    properties = settings["properties"]
    required = settings["required"]
    assert properties == {
        "retries": INTEGER,
        "tags": {"type": "array", "items": STRING},
        "proxy": {"anyOf": [STRING, NULL]},
    }
    assert required == []


@test("dataclasses declared later in the module resolve without quotes, nested and inside lists")
def _():
    schema = mod.build_schema(mod.Order)
    properties = schema["properties"]
    required = schema["required"]
    customer = properties["customer"]
    lines = properties["lines"]
    assert customer == CUSTOMER
    assert lines == {"type": "array", "items": LINE}
    assert properties["paid"] == {"type": "boolean"}
    assert properties["note"] == {"anyOf": [STRING, NULL]}
    assert required == ["id", "customer", "lines"]


@test("string annotations are evaluated before they are mapped")
def _():
    schema = mod.build_schema(mod.Coupon)
    properties = schema["properties"]
    assert properties == {"code": STRING, "percent": INTEGER, "skus": {"type": "array", "items": STRING}}


@test("annotation_text returns every annotation as source text, even with undefined names")
def _():
    draft = mod.annotation_text(Draft)
    order = mod.annotation_text(mod.Order)
    assert draft == {"owner": "Undefined", "reviewers": "list[Reviewer] | None"}
    assert order == {"id": "int", "customer": "Customer", "lines": "list[Line]", "paid": "bool", "note": "str | None"}


@test("unsupported annotations raise TypeError naming the field")
async def _():
    for cls, name in ((Scores, "values"), (Either, "value")):
        error = await capture_error(lambda: mod.build_schema(cls))
        assert isinstance(error, TypeError)
        assert name in str(error)
