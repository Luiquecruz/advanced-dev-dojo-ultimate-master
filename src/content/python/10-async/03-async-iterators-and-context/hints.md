Put the `yield` inside the page loop: `while (page := await fetch_page(number)) is not None:` then `for item in page: yield item`, then `number += 1`. The generator pauses at each `yield`, so the next `fetch_page` only runs when the consumer asks for the item after the last one of the page.
---
Wrap the generator: `async with aclosing(generator) as values: async for item in values: ...`. Append the item first, then `break` once `len(items)` reaches `limit`, so no extra item is pulled. Leaving the `async with` awaits `generator.aclose()`.
---
In `AsyncConnection`, `__aenter__` must `return self`. `__aexit__` sets the flag, records `"close"` and returns `None` (just leave out the `return`), which lets any exception from the block continue. `fetch_page` checks `self.is_open` before anything else.
