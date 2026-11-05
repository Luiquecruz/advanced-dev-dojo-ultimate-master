When the `with` block raises, the exception is thrown into your generator at the `yield` line. Anything after `yield` that is not inside `finally` is skipped.
---
Use the same shape in all three functions: setup, then `try: yield ... finally: teardown`. Do not add an `except` clause: catching the exception without re-raising it would suppress it.
---
For `temporary_env`, read the old value with a private sentinel, `previous = mapping.get(key, _MISSING)` where `_MISSING = object()`. In `finally`, `mapping.pop(key, None)` when `previous is _MISSING`, otherwise put `previous` back. For `captured_output`, keep the original `sys.stdout` in a local before replacing it.
