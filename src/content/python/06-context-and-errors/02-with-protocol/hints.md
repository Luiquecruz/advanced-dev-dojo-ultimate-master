`with manager as name:` binds whatever `__enter__` **returns**. A method without `return` returns `None`, so end both `__enter__` methods with `return self`.
---
`__exit__` receives `(exc_type, exc, traceback)`. All three are `None` when the block succeeded; otherwise `exc` is the exception instance. Branch on `exc is None` to choose between `commit()` and `rollback()`.
---
The return value of `__exit__` decides whether the exception survives: a true value swallows it. Store `self.error = exc`, roll back, and `return False` so `with` re-raises the original exception. The nesting order of several managers comes for free once each one is correct.
