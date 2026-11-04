1. Run the starter demo and compare its export with the expected wire format: key style, datetime format, decimals, nested lines and the missing total.
2. Fix the shared config first; both models parse camelCase input already, so check that Python names work too and that errors are located by the name the input used.
3. Declare the two constraints with `Field` and look at how they appear in `Line.model_json_schema()`.
4. Turn `total_due` into a computed field and confirm it appears in `model_dump()` and in the serialization schema, but not in the validation schema.
5. Rewrite `export` with the JSON mode and aliases, then feed the export back into `Invoice.model_validate` with and without `totalDue` to see why a derived value is output only.
6. Write `schema_properties` from the generated schema and test it on a throwaway model to make sure nothing about `Invoice` is hard-coded.
