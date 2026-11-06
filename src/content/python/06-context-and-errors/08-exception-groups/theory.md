An **`ExceptionGroup`** is one exception that carries several unrelated ones. It exists for code where many things fail independently and every failure matters: concurrent tasks, batch jobs, validating every field of a form. `except*` handles the members of a group by type.

```py
errors = [ValueError("amount must be positive"), KeyError("card"), ValueError("currency")]

try:
    raise ExceptionGroup("validation failed", errors)
except* ValueError as group:              # a group holding only the two ValueErrors
    print(len(group.exceptions), "value problems")
except* KeyError as group:
    print("missing:", [str(error) for error in group.exceptions])
# 2 value problems
# missing: ["'card'"]
```

Each `except*` clause runs **at most once** and receives a *group* containing only the matching members. Members no clause matched are re-raised together, in a new group with the same message.

## How it works

- `ExceptionGroup(message, exceptions)` needs a **non-empty** sequence (`ValueError` otherwise) of `Exception` instances (`TypeError` for a `BaseException` member). `BaseExceptionGroup` accepts any exception, and returns an `ExceptionGroup` when every member is an `Exception`. `ExceptionGroup` is an `Exception`; `BaseExceptionGroup` is not.
- `except* T` splits the group: matching members, **including subclasses and members of nested groups**, go to the clause as a group that keeps the original nesting and message. A plain exception (not a group) that matches is wrapped in an `ExceptionGroup` with an empty message, so the target is always a group.
- Rules: one `try` uses either `except` or `except*`, never both; `except* ExceptionGroup` raises `TypeError`; `return`, `break` and `continue` cannot appear inside an `except*` clause, so assign results and return after the `try`.
- `group.subgroup(condition)` returns a group with the matching members, structure kept, or **`None`** when nothing matches. `group.split(condition)` returns `(match, rest)`. The condition is a type, a tuple of types, or a predicate function. `derive(excs)` builds a same-message group, and subclasses override it so `split`/`subgroup` keep their class.
- A plain `except ExceptionGroup as group:` still works when one handler deals with the whole group.

`asyncio.TaskGroup` (module 10) is the main producer: when child tasks fail, it raises an `ExceptionGroup` with every failure.

> **Status as of November 2026:** `ExceptionGroup`, `BaseExceptionGroup` and `except*` arrived in Python 3.11 (PEP 654). Since 3.13 `subgroup` and `split` accept any callable predicate, since 3.12 `contextlib.suppress` filters groups, and since 3.14 (PEP 758) `except* A, B:` may omit the parentheses when there is no `as`.

## Common mistakes

**Filtering `group.exceptions` by hand.** A loop with `isinstance` over the top-level members misses the failures inside nested groups (a task group inside a task group, the address block inside a form), and silently drops every type it does not list. `except*` walks the nesting and re-raises whatever no clause matched:

```py
# wrong: the nested ValueError is not counted, and the KeyError vanishes
values = sum(isinstance(error, ValueError) for error in group.exceptions)

# right: every ValueError at any depth, and the rest propagates
try:
    raise group
except* ValueError as matched:
    report(matched)
```

The group a clause receives keeps the nesting, so `len(matched.exceptions)` still counts top-level members, not failures: walk nested groups to count leaves. A plain `except ValueError` does not match a group at all, even one that holds only `ValueError`s: the group is an `ExceptionGroup`. And a loop that raises at the first failed rule reports one problem per submission when the caller needed all of them.

## When to choose it

- **An `ExceptionGroup`** when several independent failures happen in one operation and the caller needs all of them: field validation, batch imports, concurrent tasks.
- **`except*`** to handle some member types and let the others propagate, without writing the filtering yourself.
- **`subgroup`/`split`** to pass on or report part of a group while keeping its structure.
- **A single exception** when one failure makes the rest meaningless (the connection is gone): do not wrap a lone error in a group just in case.
