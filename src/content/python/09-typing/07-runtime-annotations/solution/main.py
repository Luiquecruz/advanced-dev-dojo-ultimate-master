import annotationlib
import dataclasses
import typing
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


def schema_for(annotation: object, field: str) -> dict[str, object]:
    """The JSON-Schema-like fragment for one resolved annotation."""
    if isinstance(annotation, type) and annotation in SCALARS:
        return {"type": SCALARS[annotation]}
    if isinstance(annotation, type) and dataclasses.is_dataclass(annotation):
        return build_schema(annotation)
    origin = typing.get_origin(annotation)
    arguments = typing.get_args(annotation)
    if origin is list and len(arguments) == 1:
        return {"type": "array", "items": schema_for(arguments[0], field)}
    if origin is typing.Union and len(arguments) == 2 and type(None) in arguments:
        (member,) = [argument for argument in arguments if argument is not type(None)]
        return {"anyOf": [schema_for(member, field), {"type": "null"}]}
    raise TypeError(f"{field}: unsupported annotation {annotation!r}")


def build_schema(cls: type) -> dict[str, object]:
    """Describe a dataclass as a JSON-Schema-like dict."""
    hints = typing.get_type_hints(cls)
    properties = {}
    required = []
    for field in dataclasses.fields(cls):
        properties[field.name] = schema_for(hints[field.name], field.name)
        if field.default is dataclasses.MISSING and field.default_factory is dataclasses.MISSING:
            required.append(field.name)
    return {"title": cls.__name__, "type": "object", "properties": properties, "required": required}


def annotation_text(cls: type) -> dict[str, str]:
    """The annotations of cls as source text, without evaluating them."""
    return annotationlib.get_annotations(cls, format=annotationlib.Format.STRING)
