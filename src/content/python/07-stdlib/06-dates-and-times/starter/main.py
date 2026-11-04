import calendar
from datetime import date, datetime, timedelta, timezone


def to_utc(text: str) -> datetime:
    # TODO: refuse naive results with ValueError, and convert the instant to UTC instead of
    # stamping UTC on the local wall-clock time.
    return datetime.fromisoformat(text).replace(tzinfo=timezone.utc)


def add_months(value: date, months: int) -> date:
    # TODO: move by calendar months (year and month arithmetic with divmod), clamping the day
    # with calendar.monthrange. Thirty days is not a month.
    return value + timedelta(days=30 * months)


def age_in_days(start: datetime, end: datetime) -> int:
    # TODO: refuse naive datetimes and an end before the start, then count whole 24-hour
    # periods between the instants, not the difference between calendar dates.
    return (end.date() - start.date()).days
