from datetime import date, datetime, timedelta, timezone

UTC = timezone.utc
BRASILIA = timezone(timedelta(hours=-3))


def raised(action):
    """Returns the name of the exception `action` raises, or "nothing"."""
    try:
        action()
    except Exception as error:
        return type(error).__name__
    return "nothing"


@test("to_utc converts any offset to the same instant expressed in UTC")
def _():
    expected = datetime(2026, 11, 4, 13, 15, tzinfo=UTC)
    for text in ("2026-11-04T10:15:00-03:00", "2026-11-04T13:15:00Z", "2026-11-04T18:45:00+05:30"):
        result = mod.to_utc(text)
        wall_clock = (result.hour, result.minute)
        offset = result.utcoffset()
        assert result == expected
        assert wall_clock == (13, 15)
        assert offset == timedelta(0)


@test("to_utc rejects text without an offset")
def _():
    outcomes = {text: raised(lambda: mod.to_utc(text)) for text in ("2026-11-04T10:15:00", "2026-11-04", "yesterday")}
    assert outcomes == {"2026-11-04T10:15:00": "ValueError", "2026-11-04": "ValueError", "yesterday": "ValueError"}


# beginner mistake: adding timedelta(days=30) per month, which drifts past short months
@test("add_months clamps the day to the last day of the target month")
def _():
    cases = {
        (date(2026, 1, 31), 1): date(2026, 2, 28),
        (date(2028, 1, 31), 1): date(2028, 2, 29),
        (date(2026, 3, 31), 1): date(2026, 4, 30),
        (date(2026, 8, 31), 6): date(2027, 2, 28),
        (date(2026, 5, 15), 1): date(2026, 6, 15),
    }
    results = {key: mod.add_months(*key) for key in cases}
    assert results == cases


@test("add_months goes backwards, crosses years and keeps the time and offset of a datetime")
def _():
    assert mod.add_months(date(2026, 3, 31), -1) == date(2026, 2, 28)
    assert mod.add_months(date(2026, 1, 15), -1) == date(2025, 12, 15)
    assert mod.add_months(date(2026, 11, 30), 15) == date(2028, 2, 29)
    assert mod.add_months(date(2026, 6, 10), -18) == date(2024, 12, 10)
    moved = mod.add_months(datetime(2026, 1, 31, 9, 30, tzinfo=BRASILIA), 1)
    kind = type(moved).__name__
    assert kind == "datetime"
    assert moved == datetime(2026, 2, 28, 9, 30, tzinfo=BRASILIA)
    assert moved.utcoffset() == timedelta(hours=-3)


@test("age_in_days counts whole days between instants, not calendar dates")
def _():
    late_evening = datetime(2026, 11, 1, 22, 0, tzinfo=BRASILIA)
    next_night = datetime(2026, 11, 3, 0, 30, tzinfo=UTC)
    short = mod.age_in_days(late_evening, next_night)
    assert short == 0
    long = mod.age_in_days(datetime(2026, 1, 1, tzinfo=UTC), datetime(2026, 3, 1, tzinfo=UTC))
    assert long == 59
    naive = raised(lambda: mod.age_in_days(datetime(2026, 1, 1), datetime(2026, 1, 2, tzinfo=UTC)))
    backwards = raised(lambda: mod.age_in_days(next_night, late_evening))
    assert naive == "ValueError"
    assert backwards == "ValueError"
