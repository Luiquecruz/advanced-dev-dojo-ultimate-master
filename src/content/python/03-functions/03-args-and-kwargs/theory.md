A Python call can pass arguments **by position** and **by name**, and a function can collect whatever is left over:

```py
def log(level, *messages, **fields):
    print(level, messages, fields)

log("info", "started", "ready", user="ada", port=8080)
# info ('started', 'ready') {'user': 'ada', 'port': 8080}
```

- `*messages` collects extra positional arguments into a **tuple**.
- `**fields` collects extra keyword arguments into a **dict**, in the order they were passed.

At the call site the same symbols do the opposite: they **unpack**.

```py
parts = ("warn", "disk", "full")
extra = {"host": "db1"}
log(*parts, **extra)     # same as log("warn", "disk", "full", host="db1")
```

## How it works

Python binds arguments in a fixed order: positional values fill named parameters left to right, the rest go to `*args`; keyword values match parameter names, the rest go to `**kwargs`. A parameter that appears **after** `*args` can only be passed by name, which is how a wrapper reserves an option for itself:

```py
def retry_call(function, /, *args, attempts=3, **kwargs):
    ...                        # attempts never reaches `function`

retry_call(fetch, "orders", attempts=5, timeout=2)
# args == ("orders",), kwargs == {"timeout": 2}
```

The `/` after `function` matters for wrappers. Every parameter before `/` is **positional-only**: callers cannot pass it by name, so its name is free for the callee. Without it, `def forward(function, *args, **kwargs)` treats a caller's `function="report"` as a second value for the wrapper's own parameter and raises `TypeError: got multiple values for argument 'function'`. With `function, /`, that keyword lands in `kwargs` and reaches the callee. The next lesson covers `/` and `*` in full.

Pitfalls:

- `*args` is always a tuple, even when the caller passed a list with `*`.
- `**kwargs` is a fresh dict per call; changing it does not touch the caller's dict.
- Keys unpacked with `**` must be strings (`TypeError: keywords must be strings`), and a name the target neither declares nor collects in its own `**kwargs` raises `TypeError: unexpected keyword argument`.
- Re-raising inside a retry loop: keep the last exception and `raise` it after the loop, so the caller sees the real error and its traceback.

## Common mistakes

**Forwarding the collections without unpacking them.** Inside the wrapper, `args` is one tuple and `kwargs` is one dict. Passing them as they are calls the target with exactly two positional values, so it fails with a `TypeError` or, worse, computes with the wrong values:

```py
# wrong: target receives (("orders",), {"timeout": 2})
def forward(function, /, *args, **kwargs):
    return function(args, kwargs)

# right: target receives ("orders", timeout=2)
def forward(function, /, *args, **kwargs):
    return function(*args, **kwargs)
```

**Forwarding the wrapper's own option.** Writing `function(*args, attempts=attempts, **kwargs)` hands `attempts` to a callee that never declared it. A callee without `**kwargs` raises `TypeError: ... got an unexpected keyword argument 'attempts'` on every attempt; one with `**kwargs` silently receives an option that was not meant for it.

## When to choose it

- **`*args, **kwargs`** for wrappers that do not care about the target's signature: decorators, retry helpers, logging and timing wrappers.
- **Explicit parameters** for public functions. `def send(to, body, *, retries=0)` documents itself, and checkers and IDEs understand it; `def send(*args, **kwargs)` hides the contract.
- **Positional-only wrapper parameters** (`function, /`) whenever the wrapper forwards arbitrary keywords.
- **A dataclass or `TypedDict`** instead of passing a growing `**options` bag through many layers.
