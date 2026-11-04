`logging.getLogger(name)` always returns the same object, so handlers added by an earlier call are still there. Remove every handler in `list(logger.handlers)` (and close it) before adding the new one, and set `logger.propagate = False`.
---
`extra={"fields": fields}` creates one record attribute, `record.fields`, so no field name can clash with `name` or `message`. In `RedactFilter.filter`, build a new dict with a comprehension and assign it to `record.fields`; return `True` so the record is still emitted.
---
Attach the filter with `handler.addFilter(...)`, not `logger.addFilter(...)`: logger filters skip records propagated from `name.db`. In the formatter, `json.dumps(value, default=str, ensure_ascii=False)` quotes and escapes values, and a final `.replace("\r", "\\r").replace("\n", "\\n")` keeps the message on one line too.
