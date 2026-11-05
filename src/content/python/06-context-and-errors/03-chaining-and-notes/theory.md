When code translates one error into another, the original is the **root cause** operators need. Python keeps it on the new exception, and `raise ... from ...` says explicitly that one caused the other. Notes add context on the way up without changing the message.

```py
import json

class ConfigError(Exception):
    pass

def load(text, path):
    try:
        return json.loads(text)
    except json.JSONDecodeError as error:
        raise ConfigError(f"{path} is not valid JSON") from error

try:
    load('{"region": }', "capture.json")
except ConfigError as error:
    error.add_note("order_id=7")
    print(type(error.__cause__).__name__)    # JSONDecodeError
    print(error.__notes__)                   # ['order_id=7']
```

The traceback prints the `JSONDecodeError` first, then *"The above exception was the direct cause of the following exception:"*, then the `ConfigError` followed by its notes.

## Coming from TypeScript and JavaScript

```ts
try {
  return JSON.parse(text);
} catch (error) {
  throw new ConfigError(`invalid config: ${(error as Error).message}`);   // cause lost
}
// opt-in since ES2022: new ConfigError("invalid config", { cause: error })
```

- **Copying the message instead of keeping the cause.** The JavaScript habit keeps only the text. In Python, `raise ConfigError(...)` inside `except` still records the original as `__context__` ("During handling of the above exception, another exception occurred"), which reads like a second bug in the handler. `from error` records it as `__cause__`, the intended translation.
- **Growing the message for context.** `error.message += " (order 7)"` becomes `error.args = (...)` in Python, which breaks callers that read `args`, compare messages or group errors by message in monitoring. `add_note()` attaches the context separately, and every traceback prints it.

## How it works

Every exception has three chaining attributes:

| Attribute | Set by | Meaning |
| --- | --- | --- |
| `__context__` | automatically, when raising while another exception is handled | the exception that was being handled |
| `__cause__` | `raise new from original` | the explicit cause |
| `__suppress_context__` | `from` (any value) | `True`: do not print `__context__` |

- `raise new from original` sets `__cause__`, and the traceback says "direct cause".
- `raise new from None` sets `__cause__ = None` and `__suppress_context__ = True`: the traceback shows only the new exception. The original is **still** stored in `__context__` for debuggers and for code that inspects it.
- A bare `raise` inside `except` re-raises the same object with its traceback; `raise error` from a stored variable also keeps the object but adds the current line to the traceback.
- `add_note(text)` appends a string to `__notes__`, creating the list on first use; anything but a `str` raises `TypeError`. Notes accumulate, so each layer that catches and re-raises can add its own.

Choose deliberately: `from error` when the original explains the failure (I/O, parsing, a remote call), `from None` when it is an implementation detail that would only confuse (a `KeyError` from the internal dict behind a settings lookup).

> **Status as of November 2026:** `add_note()` and `__notes__` were added in Python 3.11 (PEP 678), and the standard `traceback` module prints notes after the exception message. Exception chaining with `from` dates from Python 3.0 (PEP 3134).

### Security note

Messages and notes end up in logs, error trackers and sometimes in responses. Add identifiers that help the investigation (order ID, region, attempt) and never secrets: tokens, card numbers, passwords or full request bodies. `from None` is **not** a way to hide sensitive data: it changes what the default traceback prints, while `__context__` still holds the original exception and its frames. If a value must not leak, do not put it in an exception at all.

## When to choose it

- **`raise DomainError(...) from error`** whenever a boundary translates a low-level exception (parsing, I/O, a client library) into its own error.
- **`from None`** only when the original adds noise and no diagnostic value.
- **`add_note()`** for context known by an outer layer: the request, the order, the retry attempt. Keep the message about *what* failed.
- **A bare `raise`** when the handler only logs or cleans up and the error should continue unchanged.
