1. List the three ways a block can end for a suppressing manager: no exception, a declared exception, anything else. Write the return value of `__exit__` for each.
2. Pick a matching test that works for all three, including the case where every argument is `None`, and that counts subclasses.
3. Build `ErrorCollector` from the same decision, adding the one side effect on the matching branch, and keep the collector reusable across blocks.
4. Write `run_all` around one collector: decide where the collector is created, what goes inside the `with` block, and why a failed call adds nothing to `results`.
5. Check what `ErrorCollector(Exception)` does with an exception that derives from `BaseException` only, and confirm that it stops the loop.
6. Re-read the security note: name one real failure that a catch-everything collector would hide.
