Start with `build_client`: wrap from the inside out. `authenticated(tokens)(call)` first, then `retried`, then `measured`, then `cached`, so the last one applied is the outermost. Writing the layers as a list, outermost first, and applying them in `reversed` order keeps the intent readable.
---
Replace `_CACHE` with the injected `store` and delete the module-level dict. In `measured`, read `start = clock()` before the call and append the sample in a `finally` block, so failures are recorded too; add `@functools.wraps(function)` to its wrapper.
---
In `authenticated`, wrap the first call in `try` and catch only `AuthExpired`. In the `except` block, call the function once more with `token=tokens.refresh()` and do not catch anything there, so a second expiry escapes.
