1. Draw the path of one record: logger level, logger filters, record creation with `extra`, then each handler's level, filters and formatter. Mark where redaction must happen so every handler and every child logger is covered.
2. Make `configure_logger` idempotent: call it twice in the editor and count `logger.handlers` before and after your change.
3. Decide how fields travel on the record so that any key works; try `name="ada"` with your first idea.
4. Write the filter so it replaces `record.fields` with a redacted copy, then check that the dict you passed in is unchanged afterwards.
5. Feed the formatter a value containing `"\n"` and count the lines in the stream; quoting values as JSON and escaping the final line keeps one record on one line.
6. Log from `logging.getLogger(f"{name}.db")` and confirm its secrets are redacted as well.
