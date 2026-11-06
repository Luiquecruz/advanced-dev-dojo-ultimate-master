**Question this module answers:** who releases the resource when something fails, and what does an exception carry?

## Prerequisites

Module 03 (decorators and closures), module 04 (classes, inheritance and special methods) and module 05 (generators, `yield` and `close()`, which `@contextmanager` builds on). The basics of `raise`, `try`/`except`, `else` and `finally` are in module 00 (lesson 08, errors and exceptions); this module explains what `except` matches and what an exception keeps.

## Cleanup that cannot be skipped

```py
with Transaction(store) as transaction:   # __enter__ runs, its result is bound to the name
    transaction.store.save(order)
# __exit__ has run here: after success, after an exception, after return or break
```

A `with` block calls the manager's `__exit__` on every way out of the block, and `__exit__` receives the exception, so it can commit or roll back, log, or (rarely, on purpose) swallow it. `try/finally` gives the same guarantee for one piece of code; a context manager packages the guarantee so every caller gets it without repeating it.

## What an exception carries

An exception is an instance of a class under `BaseException`, and `raise` accepts only such an instance or such a class (Python then creates the instance), so `except` matches by class and a library's hierarchy is part of its API. Its **class** says what went wrong and decides which `except` clause matches; its **message** is for humans; `__context__` links it automatically to the error being handled when it was raised, and `__cause__` to the one `raise ... from` names; `__notes__` carry extra context added on the way up; an **`ExceptionGroup`** carries several unrelated failures at once.

## The path

2. Exception hierarchies for a domain.
3. Chaining with `raise ... from` and context with `add_note`.
4. The `with` protocol: `__enter__`, `__exit__` and what its return value means.
5. `@contextmanager`: a context manager written as a generator with one `yield`.
6. Suppressing on purpose, and only the declared exception types.
7. `ExitStack` for a number of resources known only at run time.
8. Exception groups and `except*`.
9. The ADR: resources and errors of a payment-capture workflow.

> **Status as of November 2026:** the dojo runs CPython 3.14 in Pyodide. Since 3.14 (PEP 765) the compiler emits a `SyntaxWarning` for `return`, `break` or `continue` that leaves a `finally` block, because they silently discard the exception in flight.

## When to choose it

Read this module before you write code that holds connections, locks, files or temporary state, or before you design the errors a library raises. It ends with one decision per workflow: how each resource is released (a context manager, `try/finally` or an `ExitStack`), and what each failure carries (its class in a hierarchy, its cause, its notes, and whether several failures travel together in a group).
