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

## Coming from TypeScript and JavaScript

JavaScript has rest parameters and spread for positional values, but no named arguments. Named values travel in an options object, so JS developers often forward a wrapper like this:

```ts
function forward(fn: (...a: any[]) => any, ...args: any[]) {
  return fn(...args);           // options objects are just one more positional value
}
```

The direct translation breaks in Python:

```py
def forward(function, *args, **kwargs):
    return function(args, kwargs)    # passes ONE tuple and ONE dict as two positional values
```

`function(args, kwargs)` calls the target with exactly two arguments. Forwarding means unpacking both: `function(*args, **kwargs)`. A second trap is the wrapper's own parameter names: with `def forward(function, *args, **kwargs)`, a caller that forwards a keyword called `function=` gets `TypeError: got multiple values for argument 'function'`. Marking the wrapper's parameter positional-only (`function, /`) frees that name for `**kwargs`.

## How it works

Python binds arguments in a fixed order: positional values fill named parameters left to right, the rest go to `*args`; keyword values match parameter names, the rest go to `**kwargs`. A parameter that appears **after** `*args` can only be passed by name, which is how a wrapper reserves an option for itself:

```py
def retry_call(function, /, *args, attempts=3, **kwargs):
    ...                        # attempts never reaches `function`

retry_call(fetch, "orders", attempts=5, timeout=2)
# args == ("orders",), kwargs == {"timeout": 2}
```

Pitfalls:

- `*args` is always a tuple, even when the caller passed a list with `*`.
- `**kwargs` is a fresh dict per call; changing it does not touch the caller's dict.
- Keyword names must be strings and valid parameter names of the target, or the target raises `TypeError`.
- Re-raising inside a retry loop: keep the last exception and `raise` it after the loop, so the caller sees the real error and its traceback.

## When to choose it

- **`*args, **kwargs`** for wrappers that do not care about the target's signature: decorators, retry helpers, logging and timing wrappers.
- **Explicit parameters** for public functions. `def send(to, body, *, retries=0)` documents itself, and checkers and IDEs understand it; `def send(*args, **kwargs)` hides the contract.
- **Positional-only wrapper parameters** (`function, /`) whenever the wrapper forwards arbitrary keywords.
- **A dataclass or `TypedDict`** instead of passing a growing `**options` bag through many layers.
