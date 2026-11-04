import io
import logging

from main import configure_logger, log_event

stream = io.StringIO()
logger = configure_logger("payments", stream, logging.INFO)
logger = configure_logger("payments", stream, logging.INFO)

log_event(logger, "login", user="ada", password="hunter2", attempts=1)
log_event(logger, "login", user='mallory\nINFO payments admin_login user="root"')
logging.getLogger("payments.db").info("connect", extra={"fields": {"api_key": "sk-123", "host": "db-1"}})
logger.debug("not emitted")
logger.warning("refund of %s pending", "A-104")

print("handlers:", len(logger.handlers))
for line in stream.getvalue().splitlines():
    print(line)
