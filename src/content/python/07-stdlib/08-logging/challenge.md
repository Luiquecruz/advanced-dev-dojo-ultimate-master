A payments service logs one line per event for operators. Its last incident review found duplicated lines, a password in the logs and a forged line injected through a username. Build its logging setup in `main.py` from objects you pass around, never from module-level state. `SECRET_KEYS` is already defined.

## `class RedactFilter(logging.Filter)`

`filter(record)` always returns `True`. When the record has a `fields` attribute holding a dict, replace it with a **new** dict in which the value of every key whose lowercase form is in `SECRET_KEYS` becomes `"[REDACTED]"`. Never modify the dict the caller passed.

## `class FieldsFormatter(logging.Formatter)`

Formats a record as `<LEVEL> <logger name> <message>`, followed by one ` key=value` pair per entry of `record.fields` (when present), sorted by key, with each value written as JSON: `INFO payments login attempts=2 user="ada"`. The result is always a **single line**: carriage returns and line feeds anywhere in it are written as the two characters `\r` and `\n`.

## `configure_logger(name, stream, level)`

Returns `logging.getLogger(name)` configured so that, however many times `configure_logger` runs, the logger has **exactly one** handler: a `logging.StreamHandler` writing to `stream` (the latest one passed), with a `FieldsFormatter` and a `RedactFilter`. Put the filter on the handler, so records from child loggers such as `f"{name}.db"` that propagate to it are redacted too. Set the logger level to `level` and `propagate` to `False`.

## `log_event(logger, event, /, **fields)`

Logs `event` at `INFO` and attaches `fields` to the record as one attribute, `record.fields` (a dict), through the `extra` argument. Field names that `LogRecord` already uses, such as `name` or `message`, must work.
