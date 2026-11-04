Print `dataclasses.fields(Order)[1].type` and `typing.get_type_hints(Order)["customer"]`: the first is a `ForwardRef` captured when the decorator ran, the second the real `Customer` class. For `Coupon`, `field.type` is even a plain string. Build the schema from `get_type_hints`.
---
Split each annotation with `typing.get_origin` and `typing.get_args`: `list[Line]` gives `list` and `(Line,)`; `str | None` gives `typing.Union` and `(str, NoneType)`. Check scalars first with an exact lookup (`bool` is a subclass of `int`), use `dataclasses.is_dataclass` for nesting, and raise `TypeError(f"{field}: ...")` when nothing matches.
---
A field is required when `field.default is dataclasses.MISSING and field.default_factory is dataclasses.MISSING`. For `annotation_text`, `annotationlib.get_annotations(cls, format=annotationlib.Format.STRING)` already returns the dict you need.
