`bool(obj)` tries `__bool__` first, then `__len__`. `Basket` needs only `__len__`; `Quota` needs `__bool__` and must not define `__len__`.
---
`coalesce` is about absence, so it must test `value is not None`. `first_truthy` is about truthiness, so a plain `if value:` is correct there.
---
Both helpers are a loop over `values` with an early `return`, followed by the fallback return after the loop.
