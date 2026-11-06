1. Separate what the checker sees (overload stubs, the `TypeIs` annotation, `assert_never`) from what runs (the implementation bodies).
2. Write the two overload stubs, then print `get_overloads(parse)` and the `get_type_hints` of each stub to confirm the literal and the return type.
3. Make the implementation return what each overload declares: a dict for `"json"`, a string for `"text"`, and `ValueError` for everything the overloads do not allow.
4. Build a truth table for `is_str_list` with lists, tuples, a plain string, a dict and `None`, then fix the body until every row matches; annotate it with `TypeIs`.
5. Cover every `Event` variant in `describe`, then make the fallback call `assert_never` and try it with an object of another class.
