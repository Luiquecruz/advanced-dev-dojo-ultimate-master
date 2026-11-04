A default is evaluated once, when `def` runs. Any `[]` or `{}` in a signature is one shared object. Replace it with `None` and build the new object inside the body.
---
Test the sentinel with `is None`, not with truthiness: `tags or []` throws away an empty list the caller passed on purpose. In `Registry`, `dict(items)` makes the copy.
---
For `request`, define `_UNSET = object()` at module level and use it as the default. Then three branches: `headers is _UNSET` (copy the defaults), `headers is None` (empty dict), anything else (copy what was given).
