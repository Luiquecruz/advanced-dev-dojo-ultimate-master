1. Write down the `with` expansion: `__enter__` runs, its return value goes to the `as` target, the block runs inside a `try`, and `__exit__` runs on every way out.
2. Decide what each `__enter__` must return so the caller can read `timer.elapsed` and `transaction.error` after the block.
3. For `Timer`, put the second clock reading in `__exit__`, the one place that runs after both a normal end and an exception.
4. For `Transaction`, list the two exits separately: success (all three arguments `None`) and failure (an exception instance). Write which store method each one calls and what is recorded.
5. Choose the return value of `__exit__` deliberately: the block's exception must keep propagating, unchanged.
6. Trace `with Transaction(a), Transaction(b):` as two nested blocks and check which store is finished first when the body raises.
