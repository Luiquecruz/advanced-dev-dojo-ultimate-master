import json


def json_type_of(value):
    """The JSON Schema type name of a decoded JSON value."""
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "boolean"
    if isinstance(value, int):
        return "integer"
    if isinstance(value, float):
        return "number"
    if isinstance(value, str):
        return "string"
    if isinstance(value, list):
        return "array"
    if isinstance(value, dict):
        return "object"
    return type(value).__name__


def matches_type(value, expected_type):
    actual_type = json_type_of(value)
    if expected_type == "integer" and isinstance(value, float):
        return value.is_integer()
    return actual_type == expected_type or (expected_type == "number" and actual_type == "integer")


def check(schema, value, path, issues):
    """Validates one value against a JSON Schema subset (enum, type, minimum, maximum, items, properties, required)."""
    if "enum" in schema:
        if value not in schema["enum"]:
            options = "|".join(json.dumps(option) for option in schema["enum"])
            issues.append({"path": path, "message": f"Invalid option: expected one of {options}"})
        return
    expected_types = schema["type"] if isinstance(schema["type"], list) else [schema["type"]]
    if not any(matches_type(value, expected_type) for expected_type in expected_types):
        issues.append({"path": path, "message": f"Invalid input: expected {' or '.join(expected_types)}, received {json_type_of(value)}"})
        return
    if "minimum" in schema and value < schema["minimum"]:
        issues.append({"path": path, "message": f"Too small: expected number to be >={schema['minimum']}"})
    if "maximum" in schema and value > schema["maximum"]:
        issues.append({"path": path, "message": f"Too big: expected number to be <={schema['maximum']}"})
    if isinstance(value, list) and "items" in schema:
        for index, item in enumerate(value):
            check(schema["items"], item, [*path, index], issues)
    if isinstance(value, dict) and "properties" in schema:
        for name, property_schema in schema["properties"].items():
            if name in value:
                check(property_schema, value[name], [*path, name], issues)
            elif name in schema.get("required", []):
                issues.append({"path": [*path, name], "message": "Invalid input: required field is missing"})


def safe_parse(schema, value):
    """Validates `value` against a JSON Schema: `{"success": True, "data": value}` or `{"success": False, "issues": [...]}`, each issue a `{"path", "message"}` dict."""
    issues = []
    check(schema, value, [], issues)
    return {"success": True, "data": value} if not issues else {"success": False, "issues": issues}
