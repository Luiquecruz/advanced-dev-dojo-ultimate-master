"""A small schema library for tool arguments: one declaration validates input and produces its JSON Schema, like Zod or Pydantic."""

import re
from dataclasses import dataclass, field

JSON_SCHEMA_DIALECT = "https://json-schema.org/draft/2020-12/schema"
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
MISSING = object()


@dataclass
class Issue:
    """One validation problem: `path` lists the keys leading to the value, `message` says what is wrong."""

    path: list
    message: str


@dataclass
class ParseResult:
    """The outcome of `safe_parse`: `data` when `success`, otherwise the `issues`."""

    success: bool
    data: object = None
    issues: list = field(default_factory=list)


def json_type_of(value):
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "boolean"
    if isinstance(value, (int, float)):
        return "number"
    if isinstance(value, str):
        return "string"
    if isinstance(value, list):
        return "array"
    return "object"


class Schema:
    """Base of every schema: an optional `description`, `default` and `optional` flag."""

    def __init__(self, description=None, default=MISSING, optional=False):
        self.description = description
        self.default = default
        self.optional = optional

    @property
    def required(self):
        return not self.optional and self.default is MISSING

    def json_schema(self):
        schema = self.type_schema()
        if self.default is not MISSING:
            schema["default"] = self.default
        if self.description is not None:
            schema["description"] = self.description
        return schema

    def type_schema(self):
        raise NotImplementedError

    def check(self, value, path, issues):
        raise NotImplementedError

    def safe_parse(self, value):
        """Validates a value and returns a ParseResult; never raises."""
        issues = []
        data = self.check(value, [], issues)
        return ParseResult(True, data) if not issues else ParseResult(False, None, issues)


class String(Schema):
    def __init__(self, min_length=None, **options):
        super().__init__(**options)
        self.min_length = min_length

    def type_schema(self):
        schema = {"type": "string"}
        if self.min_length is not None:
            schema["minLength"] = self.min_length
        return schema

    def check(self, value, path, issues):
        if not isinstance(value, str):
            issues.append(Issue(path, f"Invalid input: expected string, received {json_type_of(value)}"))
        elif self.min_length is not None and len(value) < self.min_length:
            issues.append(Issue(path, f"Too small: expected string to have >={self.min_length} characters"))
        return value


class Email(Schema):
    def type_schema(self):
        return {"type": "string", "format": "email"}

    def check(self, value, path, issues):
        if not isinstance(value, str):
            issues.append(Issue(path, f"Invalid input: expected string, received {json_type_of(value)}"))
        elif not EMAIL_PATTERN.match(value):
            issues.append(Issue(path, "Invalid email address"))
        return value


class Integer(Schema):
    def __init__(self, minimum=None, maximum=None, **options):
        super().__init__(**options)
        self.minimum = minimum
        self.maximum = maximum

    def type_schema(self):
        schema = {"type": "integer"}
        if self.minimum is not None:
            schema["minimum"] = self.minimum
        if self.maximum is not None:
            schema["maximum"] = self.maximum
        return schema

    def check(self, value, path, issues):
        if json_type_of(value) != "number":
            issues.append(Issue(path, f"Invalid input: expected integer, received {json_type_of(value)}"))
        elif isinstance(value, float) and not value.is_integer():
            issues.append(Issue(path, "Invalid input: expected integer, received a decimal number"))
        elif self.minimum is not None and value < self.minimum:
            issues.append(Issue(path, f"Too small: expected number to be >={self.minimum}"))
        elif self.maximum is not None and value > self.maximum:
            issues.append(Issue(path, f"Too big: expected number to be <={self.maximum}"))
        else:
            return int(value)
        return value


class Enum(Schema):
    def __init__(self, values, **options):
        super().__init__(**options)
        self.values = list(values)

    def type_schema(self):
        return {"type": "string", "enum": list(self.values)}

    def check(self, value, path, issues):
        if value not in self.values:
            options = "|".join(f'"{option}"' for option in self.values)
            issues.append(Issue(path, f"Invalid option: expected one of {options}"))
        return value


class Object(Schema):
    """An object with named fields; `strict=True` rejects keys that are not declared."""

    def __init__(self, fields, strict=False, **options):
        super().__init__(**options)
        self.fields = fields
        self.strict = strict

    def type_schema(self):
        schema = {"type": "object", "properties": {name: field_schema.json_schema() for name, field_schema in self.fields.items()}}
        required = [name for name, field_schema in self.fields.items() if field_schema.required]
        if required:
            schema["required"] = required
        if self.strict:
            schema["additionalProperties"] = False
        return schema

    def check(self, value, path, issues):
        if not isinstance(value, dict):
            issues.append(Issue(path, f"Invalid input: expected object, received {json_type_of(value)}"))
            return value
        data = {}
        for name, field_schema in self.fields.items():
            if name in value:
                data[name] = field_schema.check(value[name], [*path, name], issues)
            elif field_schema.default is not MISSING:
                data[name] = field_schema.default
            elif not field_schema.optional:
                issues.append(Issue([*path, name], "Invalid input: expected a value, received nothing"))
        unknown = [key for key in value if key not in self.fields]
        if self.strict and unknown:
            keys = ", ".join(f'"{key}"' for key in unknown)
            issues.append(Issue(path, f"Unrecognized key{'s' if len(unknown) > 1 else ''}: {keys}"))
        return data


def to_json_schema(schema):
    """The JSON Schema of a schema, with the `$schema` dialect key first; fields with a default are optional."""
    return {"$schema": JSON_SCHEMA_DIALECT, **schema.json_schema()}
