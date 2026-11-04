An ingestion service parses messages and writes an audit log. Give the checker precise types with overloads and a type guard, and make the runtime behavior match what those types promise. The tests read the registered overloads and annotations, and call the functions.

## `parse(value, mode)`

- Two `@overload` signatures above the implementation, found by `typing.get_overloads(parse)`:
  - `mode: Literal["json"]` returns `dict[str, object]`;
  - `mode: Literal["text"]` returns `str`.
  Both take `value: str` first.
- The implementation: `"json"` returns `json.loads(value)` and raises `ValueError` when the decoded value is not a JSON object (a dict); `"text"` returns `value.strip()`; any other mode raises `ValueError`.

## `is_str_list(value)`

- Annotated `-> TypeIs[list[str]]` (from `typing`).
- Returns `True` only for a `list` whose items are all `str` (an empty list counts). Tuples, strings, dicts and `None` are `False`.

## `type Event` and `describe(event)`

`Event` is already declared as `Created | Renamed | Deleted` (frozen dataclasses). `describe` returns:

- `Created(1)` → `"created 1"`
- `Renamed(1, "report")` → `"renamed 1 to report"`
- `Deleted(1)` → `"deleted 1"`

Any other value must reach `typing.assert_never(event)`, which raises `AssertionError` ("Expected code to be unreachable, ...").
