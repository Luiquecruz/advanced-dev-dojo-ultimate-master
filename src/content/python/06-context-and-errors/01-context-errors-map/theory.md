**Question this module answers:** who releases the resource when something fails, and what does an exception carry?

## Cleanup that cannot be skipped

```py
with Transaction(store) as transaction:   # __enter__ runs, its result is bound to the name
    transaction.store.save(order)
# __exit__ has run here: after success, after an exception, after return or break
```

A `with` block calls the manager's `__exit__` on every way out of the block, and `__exit__` receives the exception, so it can commit or roll back, log, or (rarely, on purpose) swallow it. `try/finally` gives the same guarantee for one piece of code; a context manager packages the guarantee so every caller gets it without repeating it.

## What an exception carries

An exception is an instance of a class under `BaseException`. Its **class** says what went wrong and decides which `except` clause matches; its **message** is for humans; `__cause__` and `__context__` link it to the error it replaced; `__notes__` carry extra context added on the way up; an **`ExceptionGroup`** carries several unrelated failures at once.

## Coming from TypeScript and JavaScript

```ts
try {
  using connection = openConnection();   // [Symbol.dispose]() runs at the end of the block
  connection.save(order);
} catch (error) {                        // error: unknown, any value can be thrown
  throw new Error("save failed", { cause: error });
}
```

- JavaScript can throw any value; Python raises only `BaseException` instances, so `except` matches by class and the hierarchy is part of an API.
- A `using` disposer never sees the error and cannot suppress it; `__exit__` sees it and decides.
- `{ cause }` is opt-in in JavaScript. Python records the exception being handled automatically (`__context__`), and `raise ... from` states the cause explicitly.

## The path

1. The `with` protocol: `__enter__`, `__exit__` and what its return value means.
2. `@contextmanager`: a context manager written as a generator with one `yield`.
3. Suppressing on purpose, and only the declared exception types.
4. `ExitStack` for a number of resources known only at run time.
5. Exception hierarchies for a domain.
6. Chaining with `raise ... from` and context with `add_note`.
7. Exception groups and `except*`.
8. The ADR: resources and errors of a payment-capture workflow.

> **Status as of November 2026:** the dojo runs CPython 3.14 in Pyodide. Since 3.14 (PEP 765) the compiler emits a `SyntaxWarning` for `return`, `break` or `continue` that leaves a `finally` block, because they silently discard the exception in flight.

## When to choose it

Read this module before you write code that holds connections, locks, files or temporary state, or before you design the errors a library raises. It ends with one decision per workflow: how each resource is released (a context manager, `try/finally` or an `ExitStack`), and what each failure carries (its class in a hierarchy, its cause, its notes, and whether several failures travel together in a group).
