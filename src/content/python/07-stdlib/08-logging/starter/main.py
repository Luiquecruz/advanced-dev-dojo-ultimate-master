import json
import logging
from typing import Any, TextIO

SECRET_KEYS = frozenset({"password", "token", "api_key", "authorization", "secret"})
REDACTED = "[REDACTED]"


class RedactFilter(logging.Filter):
    """Replaces the values of secret fields before a handler formats the record."""

    def filter(self, record: logging.LogRecord) -> bool:
        # TODO: replace record.fields with a new dict whose secret values (lowercase key in SECRET_KEYS)
        # are REDACTED. Do not modify the original dict.
        return True


class FieldsFormatter(logging.Formatter):
    """Formats `LEVEL name message key=value ...` on a single line."""

    def __init__(self) -> None:
        super().__init__("%(levelname)s %(name)s %(message)s")

    def format(self, record: logging.LogRecord) -> str:
        line = super().format(record)
        fields = getattr(record, "fields", None) or {}
        # TODO: write each value as JSON (json.dumps) and escape "\r" and "\n" in the whole line.
        pairs = [f"{key}={fields[key]}" for key in sorted(fields)]
        if pairs:
            line = " ".join([line, *pairs])
        return line


def configure_logger(name: str, stream: TextIO, level: int) -> logging.Logger:
    # TODO: a second call must not add a second handler: remove the existing ones first.
    # The handler needs a FieldsFormatter and a RedactFilter; the logger must not propagate.
    logger = logging.getLogger(name)
    handler = logging.StreamHandler(stream)
    handler.setFormatter(FieldsFormatter())
    logger.addHandler(handler)
    logger.setLevel(level)
    return logger


def log_event(logger: logging.Logger, event: str, /, **fields: Any) -> None:
    # TODO: extra=fields turns every field into a LogRecord attribute and clashes with names
    # such as "name". Attach them under a single "fields" attribute instead.
    logger.info("%s", event, extra=fields)
