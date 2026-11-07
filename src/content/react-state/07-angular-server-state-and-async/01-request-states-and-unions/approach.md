1. Declare the union type with one member per request state.
2. Hold the state in a private signal and expose a read-only copy.
3. Write `load()` as guard, `loading`, then `try` for success or empty and `catch` for error.
4. Derive `names` and `isLoading` from the state with `computed`.
