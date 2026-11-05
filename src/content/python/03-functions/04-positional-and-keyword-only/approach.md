1. For each parameter of `connect`, decide which call styles the API should accept: `host` by position only, `port` both ways, the options by name only.
2. Translate those decisions into markers: `/` closes the positional-only group, `*` opens the keyword-only group.
3. Run the forbidden calls by hand and confirm both raise `TypeError` before the body runs.
4. For `describe_signature`, let `inspect` do the parsing instead of reading `__code__` or the source: iterate the `parameters` mapping and keep its order.
5. Try the helper on a function with `*args` and `**kwargs` and on a builtin, to see every kind once.
