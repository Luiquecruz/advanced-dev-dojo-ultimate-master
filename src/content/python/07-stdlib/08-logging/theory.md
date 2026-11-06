`logging` is a tree of named loggers. Code creates **records** on a logger; **handlers** attached to that logger or its ancestors decide where they go, **formatters** turn them into text, and **levels** and **filters** decide what passes:

```py
import io
import logging

stream = io.StringIO()
handler = logging.StreamHandler(stream)
handler.setFormatter(logging.Formatter("%(levelname)s %(name)s %(message)s"))

app = logging.getLogger("shop")                 # the same object every time for this name
app.addHandler(handler)
app.setLevel(logging.INFO)

logging.getLogger("shop.payments").warning("card %s declined", "4242")
logging.getLogger("shop.payments").debug("not emitted: below INFO")
stream.getvalue()     # 'WARNING shop.payments card 4242 declined\n'
```

The child `shop.payments` has no handler and no level of its own: it inherits the effective level and **propagates** the record to the handlers of `shop`. Libraries only call `logging.getLogger(__name__)`; the application configures handlers once, at its entry point.

## How it works

1. `logger.info(...)` checks the logger's effective level, then the **logger's filters**.
2. It builds a `LogRecord`. The `extra` dict becomes record attributes; a key that the record already uses (`name`, `message`, `args`, `msg`...) raises `KeyError`, which is why structured fields are best nested under one attribute.
3. The record goes to the handlers of the logger, then of each ancestor while `propagate` is true. Each handler checks its own level and **its own filters**, then formats.

Loggers are process-wide singletons, so a setup function that adds a handler each time it runs makes every line appear once per call. Arguments passed after the message (`logger.info("login user=%s", user)`) are formatted only when a handler emits the record, and the template stays constant, so log tools can group the lines.

Filters attached to a logger are not consulted for records that come from its children, while a handler's filters see every record the handler emits. Anything that must apply to all output, such as redaction, belongs on the handler. A filter may modify the record before it is emitted. `logging.basicConfig()` does nothing if the root logger already has handlers, unless `force=True`, and libraries should add no handler except `NullHandler`.

## Common mistakes

**Adding a handler every time setup runs.** `getLogger("shop")` returns the same logger on every call, so each call adds one more handler and each record is written once per handler:

```py
# wrong: called from two modules, every line appears twice
def configure(stream):
    logger = logging.getLogger("shop")
    logger.addHandler(logging.StreamHandler(stream))
    return logger

# right: replace every handler on this logger
def configure(stream):
    logger = logging.getLogger("shop")
    for handler in list(logger.handlers):
        logger.removeHandler(handler)
        handler.close()
    logger.addHandler(logging.StreamHandler(stream))
    return logger
```

**Formatting the message yourself.** `logger.info(f"login user={user}")` builds the string even when the level drops the record, and puts user text into the template, where log tools can no longer group the lines.

## Security note

Logs are copied, shipped and read by many people, so they must never contain passwords, tokens, API keys, session cookies or full request bodies. Redact with a `logging.Filter` on the handler, keyed by field name, so no code path can forget it. Logs are also an injection target: user text containing `\n` forges an extra line that looks like a real event. Escape line breaks or write structured output (one JSON object per line). Finally, keep user text out of the format string: with arguments, a `%` in the format string is interpreted, and a template that changes with every user breaks grouping and alerting.

Since Python 3.12 a filter may return a new `LogRecord` instead of modifying the one it received, so a handler can alter a record without affecting other handlers, and `logging.getHandlerByName()` returns a configured handler by name. Python 3.14 made `QueueListener` usable as a context manager.

## When to choose it

- **`logging.getLogger(__name__)`** in every module, and handler configuration only in the application entry point (`dictConfig` for real services).
- **Idempotent setup functions** that return the logger they configured, instead of module-level state, so tests can build and inspect one.
- **Filters on handlers** for redaction and enrichment; **levels** for volume.
- **Structured fields** under one `extra` key, rendered as escaped key-value pairs or JSON lines.
- **`print`** only for program output the user asked for, never for diagnostics.
