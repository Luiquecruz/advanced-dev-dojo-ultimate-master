import json
import logging
from typing import Any, TextIO

SECRET_KEYS = frozenset({"password", "token", "api_key", "authorization", "secret"})
REDACTED = "[REDACTED]"


class RedactFilter(logging.Filter):
    """Replaces the values of secret fields before a handler formats the record."""

    def filter(self, record: logging.LogRecord) -> bool:
        fields = getattr(record, "fields", None)
        if isinstance(fields, dict):
            record.fields = {key: REDACTED if str(key).lower() in SECRET_KEYS else value for key, value in fields.items()}
        return True


class FieldsFormatter(logging.Formatter):
    """Formats `LEVEL name message key=value ...` on a single line."""

    def __init__(self) -> None:
        super().__init__("%(levelname)s %(name)s %(message)s")

    def format(self, record: logging.LogRecord) -> str:
        line = super().format(record)
        fields = getattr(record, "fields", None) or {}
        pairs = [f"{key}={json.dumps(fields[key], default=str, ensure_ascii=False)}" for key in sorted(fields)]
        if pairs:
            line = " ".join([line, *pairs])
        return line.replace("\r", "\\r").replace("\n", "\\n")


def configure_logger(name: str, stream: TextIO, level: int) -> logging.Logger:
    logger = logging.getLogger(name)
    for handler in list(logger.handlers):
        logger.removeHandler(handler)
        handler.close()
    handler = logging.StreamHandler(stream)
    handler.setFormatter(FieldsFormatter())
    handler.addFilter(RedactFilter())
    logger.addHandler(handler)
    logger.setLevel(level)
    logger.propagate = False
    return logger


def log_event(logger: logging.Logger, event: str, /, **fields: Any) -> None:
    logger.info("%s", event, extra={"fields": fields})
