import dataclasses
from dataclasses import dataclass

SCALARS = {str: "string", int: "integer", float: "number", bool: "boolean"}


@dataclass
class Order:
    id: int
    customer: Customer
    lines: list[Line]
    paid: bool = False
    note: str | None = None


@dataclass
class Customer:
    name: str
    email: str | None


@dataclass
class Line:
    sku: str
    quantity: int
    price: float


@dataclass
class Coupon:
    """Written for an older Python, with quoted annotations."""

    code: "str"
    percent: "int"
    skus: "list[str]"


# TODO: also map list[T], T | None and nested dataclasses; raise TypeError naming the field for anything else.
def schema_for(annotation: object, field: str) -> dict[str, object]:
    """The JSON-Schema-like fragment for one resolved annotation."""
    return {"type": SCALARS.get(annotation, "string")}


# TODO: read resolved annotations with typing.get_type_hints instead of field.type,
# and leave fields with a default or a default factory out of "required".
def build_schema(cls: type) -> dict[str, object]:
    """Describe a dataclass as a JSON-Schema-like dict."""
    fields = dataclasses.fields(cls)
    properties = {field.name: schema_for(field.type, field.name) for field in fields}
    return {"title": cls.__name__, "type": "object", "properties": properties, "required": [field.name for field in fields]}


# TODO: return the annotations as source strings without evaluating them (annotationlib, Format.STRING).
def annotation_text(cls: type) -> dict[str, str]:
    """The annotations of cls as source text, without evaluating them."""
    return {name: getattr(value, "__name__", str(value)) for name, value in cls.__annotations__.items()}
