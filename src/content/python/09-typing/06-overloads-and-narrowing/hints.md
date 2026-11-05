Overload stubs have `...` as their body and sit directly above the real function, each decorated with `@overload` from `typing`. The real `def parse` has no decorator and handles every mode itself.
---
`json.loads("[1, 2]")` returns a list, which breaks the declared `dict[str, object]` return type: check `isinstance(data, dict)` before returning. For `is_str_list`, test `isinstance(value, list)` first; a string is also an iterable of strings.
---
In `describe`, add a `case Deleted(id=item_id):` and replace the catch-all return with `case _: assert_never(event)`. `assert_never` is imported from `typing`.
