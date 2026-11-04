import re

LOG_LINE = re.compile(
    r"""
    (?P<timestamp>[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z)
    \x20(?P<level>DEBUG|INFO|WARNING|ERROR|CRITICAL)
    \x20\[(?P<service>[^\]\n]+)\]
    \x20(?P<message>.+)
    """,
    re.VERBOSE,
)

EMAIL = re.compile(r"([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]{0,63}@((?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,})")

ORDER_ID = re.compile(r"\bORD-[0-9]{6}\b")


def parse_log_line(line: str) -> dict[str, str] | None:
    match = LOG_LINE.fullmatch(line)
    return match.groupdict() if match else None


def _mask(match: re.Match[str]) -> str:
    return f"{match.group(1)}***@{match.group(2)}"


def mask_emails(text: str) -> str:
    return EMAIL.sub(_mask, text)


def extract_ids(text: str) -> list[str]:
    return [match.group() for match in ORDER_ID.finditer(text)]
