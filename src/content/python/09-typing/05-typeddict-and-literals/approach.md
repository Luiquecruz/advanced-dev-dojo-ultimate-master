1. Fix `UserPayload` first and print its key sets and `get_type_hints`: that metadata is the whole input of the validator.
2. Write a helper that answers "does this value fit this annotation?" for `str`, `int` (without `bool`) and `list[T]`, recursing for the items, and raises `TypeError` for anything else.
3. Treat `Literal[...]` separately, because its error message differs: compare the value with `get_args(annotation)`.
4. Loop over the declared keys in order: decide missing versus optional with `__required_keys__`, otherwise check the value and collect at most one error per key.
5. After the declared keys, report the keys of `data` that the schema does not know, in the order they appear.
6. Run the validator against a second TypedDict with `total=False` and `Required[...]` to prove nothing about `UserPayload` is hard-coded.
