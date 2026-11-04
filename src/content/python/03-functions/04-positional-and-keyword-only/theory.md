Two markers in a signature decide **how** each parameter may be passed:

```py
def connect(host, /, port=5432, *, ssl=True, timeout=None):
    ...

connect("db")                       # ok
connect("db", 5433, ssl=False)      # ok: port by position, ssl by name
connect("db", port=5433)            # ok: port either way
connect(host="db")                  # TypeError: host is positional-only
connect("db", 5433, False)          # TypeError: ssl is keyword-only
```

- Everything **before `/`** is positional-only (PEP 570).
- Everything **after `*`** (or after `*args`) is keyword-only (PEP 3102).
- Parameters in between accept both forms.

## Coming from TypeScript and JavaScript

TypeScript has no named arguments, so APIs take an **options object** to make calls readable and future-proof:

```ts
function connect(host: string, options: { port?: number; ssl?: boolean; timeout?: number } = {}) {
  const { port = 5432, ssl = true, timeout } = options;
}
connect("db", { ssl: false });
```

The habit that breaks in Python is translating that into either a `dict` parameter or a flat signature with no markers:

```py
def connect(host, port=5432, ssl=True, timeout=None): ...

connect("db", 5433, False)   # accepted: is False the ssl flag? nobody can tell
connect(host="db")           # accepted: now "host" is part of your public API forever
```

Python's equivalent of the options object is **keyword-only parameters**: callers must write `ssl=False`, defaults live in the signature, and checkers and `help()` see every option. Positional-only parameters cover the other side: a parameter name that callers cannot use is a name you can rename later without breaking anyone.

## How it works

`inspect.signature(function)` returns a `Signature` whose `parameters` mapping keeps declaration order. Each `Parameter` has a `kind`:

| `kind.name` | Declared as |
| --- | --- |
| `POSITIONAL_ONLY` | before `/` |
| `POSITIONAL_OR_KEYWORD` | plain parameter |
| `VAR_POSITIONAL` | `*args` |
| `KEYWORD_ONLY` | after `*` or `*args` |
| `VAR_KEYWORD` | `**kwargs` |

```py
import inspect

for name, parameter in inspect.signature(connect).parameters.items():
    print(name, parameter.kind.name, parameter.default)
```

Many builtins are positional-only: `inspect.signature(divmod)` prints `(x, y, /)`, which is why `divmod(x=7, y=2)` fails. Frameworks read signatures the same way to inject arguments by name (pytest fixtures, FastAPI path and query parameters).

Pitfalls:

- A bare `*` must be followed by at least one keyword-only parameter.
- A positional-only parameter may share its name with a key in `**kwargs`: `def f(name, /, **kwargs)` accepts `f("a", name="b")`.
- Adding a parameter in the middle of a positional-or-keyword list breaks positional callers; keyword-only parameters can be added anywhere.

## When to choose it

- **Keyword-only** for flags, options and anything boolean: `send(message, *, retries=3, urgent=False)`.
- **Positional-only** for the obvious first argument whose name carries no meaning (`host`, `value`, `self`-like objects) and for wrappers that forward `**kwargs`.
- **Plain parameters** for short internal functions where both styles read well.
- **A dataclass** of settings when the option list grows beyond a handful or is passed through several layers.
