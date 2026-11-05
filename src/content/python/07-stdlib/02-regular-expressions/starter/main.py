import re

# TODO: add the service in brackets (it ends at the first "]"), restrict the level to the five names,
# and use ASCII digits for the timestamp.
LOG_LINE = re.compile(r"(?P<timestamp>\S+) (?P<level>\w+) (?P<message>.*)")

# TODO: this only finds the "@". Capture the first character of the local part (1 to 64 characters
# in total, a bounded quantifier) and the domain.
EMAIL = re.compile(r"@")

# TODO: exactly six ASCII digits as a whole word.
ORDER_ID = re.compile(r"ORD-\d+")


def parse_log_line(line: str) -> dict[str, str] | None:
    # TODO: the whole line must match, not only its beginning.
    match = LOG_LINE.match(line)
    return match.groupdict() if match else None


def mask_emails(text: str) -> str:
    # TODO: replace each address through a function that keeps the first character and the domain.
    return EMAIL.sub("***", text)


def extract_ids(text: str) -> list[str]:
    return ORDER_ID.findall(text)
