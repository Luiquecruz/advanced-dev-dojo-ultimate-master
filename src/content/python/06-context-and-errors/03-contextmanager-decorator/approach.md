1. Map the generator onto the protocol: code before `yield` is `__enter__`, the yielded value is the `as` target, code after `yield` is `__exit__`.
2. Ask what happens at the `yield` line when the block raises, and decide which statement makes the teardown run anyway.
3. For each manager, write down the state before the block (a missing key, the current `sys.stdout`, nothing for the log) and what "restored" means for it.
4. Keep the exception path clean: no `except` that swallows; the error must reach the caller unchanged.
5. Trace two nested `temporary_env` calls on the same key and on different keys, with an exception in the inner block, and check the final mapping.
6. Apply `section` with `@` to a function and call it twice; check that each call is wrapped separately.
