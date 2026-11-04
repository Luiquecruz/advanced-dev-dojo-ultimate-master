Turn the briefing into numbers first: lookups per minute into lookups per second, and the 4 × 10⁹ byte budget into bytes per payload. Then ask what a scanning container would cost per second (lookups × average items compared) and what a second copy of every payload would cost per payload.
---
Try the key types on the briefing's own example. `frozenset(("acme", "evt-42"))` cannot tell which part is the tenant, and `frozenset(("x", "x"))` has one element. A `tuple` keeps positions; a joined string needs a separator that never appears in the parts.
---
If a second copy does not fit the memory budget, the order has to live in the store. Which built-in container already keeps arrival order, and which de-duplication keeps the first arrival in place? For headers, either one `MutableMapping` class or normalization in the single function that stores them.
