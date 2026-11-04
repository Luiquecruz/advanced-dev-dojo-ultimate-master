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

## Coming from TypeScript and JavaScript

`console.log` writes immediately and globally. Two habits come with it:

```ts
function setupLogging() { emitter.on("log", (line) => process.stdout.write(line)); }
setupLogging(); setupLogging();        // two listeners: every line twice
console.log(`login user=${user}`);     // the string is built even when nobody reads it
```

```py
def configure():
    logging.getLogger("shop").addHandler(logging.StreamHandler())   # one more handler per call

logger.info(f"login user={user}")      # formatted eagerly, and user text becomes the message
```

Loggers are process-wide singletons, so "setup" code that adds a handler every time it runs duplicates every line. Configure once, or make configuration idempotent by replacing the handlers it owns. Pass values as arguments (`logger.info("login user=%s", user)`): formatting is deferred until a handler emits the record, and the template stays constant, so log tools can group the lines.

## How it works

1. `logger.info(...)` checks the logger's effective level, then the **logger's filters**.
2. It builds a `LogRecord`. The `extra` dict becomes record attributes; a key that the record already uses (`name`, `message`, `args`, `msg`...) raises `KeyError`, which is why structured fields are best nested under one attribute.
3. The record goes to the handlers of the logger, then of each ancestor while `propagate` is true. Each handler checks its own level and **its own filters**, then formats.

Filters attached to a logger are not consulted for records that come from its children, while a handler's filters see every record the handler emits. Anything that must apply to all output, such as redaction, belongs on the handler. A filter may modify the record before it is emitted. `logging.basicConfig()` does nothing if the root logger already has handlers, unless `force=True`, and libraries should add no handler except `NullHandler`.

## Security note

Logs are copied, shipped and read by many people, so they must never contain passwords, tokens, API keys, session cookies or full request bodies. Redact with a `logging.Filter` on the handler, keyed by field name, so no code path can forget it. Logs are also an injection target: user text containing `\n` forges an extra line that looks like a real event. Escape line breaks or write structured output (one JSON object per line). Finally, keep user text out of the format string: with arguments, a `%` in the format string is interpreted, and a template that changes with every user breaks grouping and alerting.

> **Status as of November 2026:** since Python 3.12 a filter may return a new `LogRecord` instead of modifying the one it received, so a handler can alter a record without affecting other handlers, and `logging.getHandlerByName()` returns a configured handler by name. Python 3.14 made `QueueListener` usable as a context manager.

## When to choose it

- **`logging.getLogger(__name__)`** in every module, and handler configuration only in the application entry point (`dictConfig` for real services).
- **Idempotent setup functions** that return the logger they configured, instead of module-level state, so tests can build and inspect one.
- **Filters on handlers** for redaction and enrichment; **levels** for volume.
- **Structured fields** under one `extra` key, rendered as escaped key-value pairs or JSON lines.
- **`print`** only for program output the user asked for, never for diagnostics.
