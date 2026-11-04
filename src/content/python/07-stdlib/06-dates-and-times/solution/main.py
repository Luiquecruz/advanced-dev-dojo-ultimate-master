import calendar
from datetime import date, datetime, timedelta, timezone


def _is_aware(moment: datetime) -> bool:
    return moment.tzinfo is not None and moment.utcoffset() is not None


def to_utc(text: str) -> datetime:
    moment = datetime.fromisoformat(text)
    if not _is_aware(moment):
        raise ValueError(f"{text!r} has no UTC offset")
    return moment.astimezone(timezone.utc)


def add_months(value: date, months: int) -> date:
    year, month_index = divmod(value.year * 12 + value.month - 1 + months, 12)
    month = month_index + 1
    day = min(value.day, calendar.monthrange(year, month)[1])
    return value.replace(year=year, month=month, day=day)


def age_in_days(start: datetime, end: datetime) -> int:
    if not (_is_aware(start) and _is_aware(end)):
        raise ValueError("start and end must both be timezone-aware")
    if end < start:
        raise ValueError("end is earlier than start")
    return (end - start) // timedelta(days=1)
