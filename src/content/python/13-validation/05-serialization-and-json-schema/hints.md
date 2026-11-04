The config is shared, so fix it once: `ConfigDict(alias_generator=to_camel, validate_by_alias=True, validate_by_name=True, extra="forbid")`. Constraints go on the fields: `quantity: int = Field(gt=0)`, `unit_price: Decimal = Field(ge=0)`.
---
A plain `@property` is invisible to dumps and schemas. Stack `@computed_field` on top of `@property` and give the method a return annotation (`-> Decimal`), which is what the schema reads.
---
`model_dump()` keeps `datetime` and `Decimal` objects and Python names. The JSON-ready version takes two keyword arguments, one for the mode and one for the aliases. For the schema, call `model.model_json_schema(mode=mode)` and read its `"properties"` keys rather than `model_fields`, which knows nothing about aliases or computed fields.
