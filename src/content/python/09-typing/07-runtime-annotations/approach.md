1. Compare three views of `Order`'s annotations: `dataclasses.fields(Order)[i].type`, `Order.__annotations__` and `typing.get_type_hints(Order)`; then do the same for `Coupon`. Note which ones resolve the forward reference and the quoted strings.
2. Write the fragment function for one annotation at a time: scalars, then `list[T]` (recursing into `T`), then `T | None`, then nested dataclasses, then the `TypeError` fallback naming the field.
3. Write `build_schema` as a loop over `dataclasses.fields(cls)` that takes the type from the resolved hints and decides `required` from the field's default and default factory.
4. Check the nested result for `Order` against the `Customer` and `Line` schemas, including a nullable field that is still required.
5. For `annotation_text`, pick the `annotationlib` format that never evaluates anything and try it on a class that names an undefined type.
