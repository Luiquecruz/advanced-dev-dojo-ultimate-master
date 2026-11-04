Support wants every validation error of a payment capture request at once, not one per submission. Write three functions in `main.py` around exception groups.

## `validate_all(record, rules)`

`rules` is a list of functions; each takes the record, returns nothing when the record passes and raises an exception (`ValueError`, `KeyError`, `TypeError`...) when it fails.

- Call **every** rule, in order, even after some have failed.
- If any rule failed, raise `ExceptionGroup("validation failed", errors)` where `errors` holds the exceptions the failing rules raised, in rule order (the same objects).
- If every rule passed, or there are no rules, return `None` and raise nothing.
- Collect `Exception` subclasses only.

## `handle(group)`

Takes an exception group (it may contain nested groups) and returns `{"ValueError": <count>, "TypeError": <count>}`.

- Use `except*` clauses: raise the group inside a `try` and handle `ValueError` and `TypeError` in separate clauses.
- A count is the number of **leaf** exceptions of that type, including members of nested groups and subclasses (an `OutOfRange(ValueError)` counts as a `ValueError`). A type that does not occur counts `0`.
- Any other member type is not handled: it propagates out of `handle` as an exception group, with the original message.

## `only(group, kind)`

Returns the part of `group` whose leaf exceptions are instances of `kind`, keeping the group's message and its nesting, or `None` when nothing matches. Use `subgroup`.
