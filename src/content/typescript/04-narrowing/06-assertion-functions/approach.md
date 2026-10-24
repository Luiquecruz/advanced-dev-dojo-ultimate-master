1. Change `invariant`'s return type to `asserts condition` and throw an `Error` when the condition is falsy.
2. Change `assertIsString`'s return type to `asserts value is string` and throw a `TypeError` with the expected message when `typeof value !== 'string'`.
3. In `readConfig`, copy `host` and `port` into local constants, assert each of them, and return the object; both are now narrowed, so no `as` is needed.
