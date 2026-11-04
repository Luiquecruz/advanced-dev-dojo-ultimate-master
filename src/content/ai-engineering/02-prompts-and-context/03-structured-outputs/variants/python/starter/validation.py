import copy
import json
import re


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
    return actual_type == expected_type or (expected_type == "number" and actual_type == "integer")


def check(schema, value, path, issues):
    """Validates one value against a JSON Schema subset and returns the data with defaults applied."""
    if "enum" in schema:
        if value not in schema["enum"]:
            options = "|".join(json.dumps(option) for option in schema["enum"])
            issues.append({"path": path, "message": f"Invalid option: expected one of {options}"})
        return value
    expected_types = schema["type"] if isinstance(schema["type"], list) else [schema["type"]]
    if not any(matches_type(value, expected_type) for expected_type in expected_types):
        issues.append({"path": path, "message": f"Invalid input: expected {' or '.join(expected_types)}, received {json_type_of(value)}"})
        return value
    if isinstance(value, str) and "pattern" in schema and re.search(schema["pattern"], value) is None:
        issues.append({"path": path, "message": f"Invalid string: must match pattern {schema['pattern']}"})
    if isinstance(value, list) and "items" in schema:
        return [check(schema["items"], item, [*path, index], issues) for index, item in enumerate(value)]
    if isinstance(value, dict) and "properties" in schema:
        data = {}
        for name, property_schema in schema["properties"].items():
            if name in value:
                data[name] = check(property_schema, value[name], [*path, name], issues)
            elif "default" in property_schema:
                data[name] = copy.deepcopy(property_schema["default"])
            elif name in schema.get("required", []):
                issues.append({"path": [*path, name], "message": "Invalid input: required field is missing"})
        return data
    return value


def safe_parse(schema, value):
    """Validates `value` against a JSON Schema: `{"success": True, "data": ...}` or `{"success": False, "issues": [...]}`."""
    issues = []
    data = check(schema, value, [], issues)
    return {"success": True, "data": data} if not issues else {"success": False, "issues": issues}


def format_path(path):
    text = ""
    for part in path:
        text += f"[{part}]" if isinstance(part, int) else f".{part}"
    return text.removeprefix(".")


def prettify_error(issues):
    """One readable block per issue, naming the field it is about."""
    lines = []
    for issue in issues:
        lines.append(f"✖ {issue['message']}")
        if issue["path"]:
            lines.append(f"  → at {format_path(issue['path'])}")
    return "\n".join(lines)
