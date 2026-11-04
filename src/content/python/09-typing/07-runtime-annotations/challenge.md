Build a small schema generator from dataclass annotations, the mechanism behind validation and API libraries. `main.py` already declares the dataclasses `Order`, `Customer`, `Line` and `Coupon`. `Order` names `Customer` and `Line` **before** they are defined, without quotes, and `Coupon` uses quoted annotations, as code written for older Pythons does.

## `build_schema(cls)`

Return, for a dataclass `cls`:

```py
{"title": cls.__name__, "type": "object", "properties": {...}, "required": [...]}
```

- `properties` maps each field name, in field order, to the fragment of its **resolved** annotation:

  | Annotation | Fragment |
  | --- | --- |
  | `str`, `int`, `float`, `bool` | `{"type": "string"}`, `"integer"`, `"number"`, `"boolean"` |
  | `list[T]` | `{"type": "array", "items": <fragment of T>}` |
  | `T \| None` | `{"anyOf": [<fragment of T>, {"type": "null"}]}` |
  | another dataclass | its full `build_schema(...)` dict, nested |

- `required` lists, in field order, the fields that have neither a `default` nor a `default_factory`. A field annotated `str | None` without a default is still required (it may be `null`, but it must be present).
- Any other annotation (`dict[str, int]`, `int | str`, ...) raises `TypeError` whose message contains the field name.
- Forward references and string annotations must resolve: read the annotations with `typing.get_type_hints(cls)`, not from `dataclasses.fields(cls)[i].type`.

## `annotation_text(cls)`

Return the annotations of any class as a dict of **source strings**, without evaluating them, so it works even when a name is undefined: for `class Draft: owner: Undefined` it returns `{"owner": "Undefined"}`, and for `Order` it returns `{"id": "int", "customer": "Customer", ...}`. Use `annotationlib.get_annotations` with `annotationlib.Format.STRING`.
