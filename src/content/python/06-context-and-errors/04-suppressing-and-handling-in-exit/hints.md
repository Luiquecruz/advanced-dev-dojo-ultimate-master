The return value of `__exit__` is the whole mechanism: `True` swallows the exception, `False` lets it propagate. Return `True` only for the exceptions the caller asked for.
---
On a normal exit `exc` is `None`, and `issubclass(None, ...)` raises `TypeError`. Test the instance instead: `exc is not None and isinstance(exc, self.types)`. `isinstance` accepts the tuple that `*types` collected, and an empty tuple matches nothing.
---
`ErrorCollector.__exit__` is `Suppress.__exit__` plus `self.errors.append(exc)` on the matching branch. In `run_all`, create the collector once before the loop and write `with collector: results.append(function())` inside it: a failing call never reaches `append`.
