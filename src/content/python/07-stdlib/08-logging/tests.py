import io
import logging


class Collect(logging.Handler):
    """Keeps every record it receives."""

    def __init__(self):
        super().__init__()
        self.records = []

    def emit(self, record):
        self.records.append(record)


def lines_of(stream):
    return stream.getvalue().splitlines()


@test("configure_logger keeps one handler on the latest stream however many times it runs")
def _():
    first, second = io.StringIO(), io.StringIO()
    logger = mod.configure_logger("dojo.single", first, logging.INFO)
    again = mod.configure_logger("dojo.single", second, logging.INFO)
    handlers = len(again.handlers)
    assert again is logger
    assert handlers == 1
    assert again.propagate is False
    mod.log_event(again, "ready")
    assert first.getvalue() == ""
    assert lines_of(second) == ["INFO dojo.single ready"]


@test("the logger drops records below the configured level")
def _():
    stream = io.StringIO()
    logger = mod.configure_logger("dojo.level", stream, logging.WARNING)
    mod.log_event(logger, "heartbeat", node=1)
    logger.warning("disk %s", "full")
    assert lines_of(stream) == ["WARNING dojo.level disk full"]


@test("each line holds the level, the logger name, the message and the sorted fields")
def _():
    stream = io.StringIO()
    logger = mod.configure_logger("dojo.format", stream, logging.INFO)
    mod.log_event(logger, "login", user="ada", attempts=2)
    logger.error("payment %s failed", "A-1")
    assert lines_of(stream) == ['INFO dojo.format login attempts=2 user="ada"', "ERROR dojo.format payment A-1 failed"]


@test("log_event attaches the fields to the record, including names LogRecord already uses")
def _():
    logger = mod.configure_logger("dojo.extra", io.StringIO(), logging.INFO)
    collect = Collect()
    logger.addHandler(collect)
    mod.log_event(logger, "imported", name="ada", message="hi", count=3)
    record = collect.records[0] if collect.records else None
    fields = getattr(record, "fields", None)
    assert fields == {"name": "ada", "message": "hi", "count": 3}
    assert record.getMessage() == "imported"
    assert record.name == "dojo.extra"
    assert record.levelname == "INFO"


@test("secret fields are redacted in every line, also for records from child loggers")
def _():
    stream = io.StringIO()
    logger = mod.configure_logger("dojo.secrets", stream, logging.INFO)
    payload = {"user": "ada", "password": "hunter2"}
    mod.log_event(logger, "login", user="ada", password="hunter2", Token="abc123")
    logging.getLogger("dojo.secrets.db").info("connect", extra={"fields": payload})
    output = stream.getvalue()
    leaked = [secret for secret in ("hunter2", "abc123") if secret in output]
    assert leaked == []
    assert output.count("[REDACTED]") == 3
    assert payload == {"user": "ada", "password": "hunter2"}


@test("field values and messages cannot start a new log line")
def _():
    stream = io.StringIO()
    logger = mod.configure_logger("dojo.inject", stream, logging.INFO)
    mod.log_event(logger, "login", user='ada\nINFO dojo.inject admin_login user="root"')
    logger.info("bad request\r\nINFO dojo.inject forged")
    lines = lines_of(stream)
    assert len(lines) == 2
    assert "\\n" in lines[0]
    assert lines[1] == "INFO dojo.inject bad request\\r\\nINFO dojo.inject forged"
