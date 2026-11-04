A subscription service receives timestamps from clients in several countries, renews plans monthly and reports how long accounts have existed. Write three functions in `main.py`. They never read the system clock: callers pass every moment in, so tests can use fixed values.

## `to_utc(text)`

Parse ISO 8601 text with `datetime.fromisoformat` and return the same instant as an aware `datetime` in UTC (`utcoffset()` is zero). The text must carry an offset, either `Z` or `±HH:MM`: `"2026-11-04T10:15:00-03:00"` becomes `datetime(2026, 11, 4, 13, 15, tzinfo=timezone.utc)`. Raise `ValueError` for text without an offset (such as `"2026-11-04T10:15:00"` or `"2026-11-04"`) and for text that is not a timestamp.

## `add_months(value, months)`

`value` is a `datetime.date` or a `datetime.datetime`. Return a value of the same type moved by `months` calendar months (negative values go back, across years when needed). When the target month is shorter, clamp the day to its last day: January 31 plus one month is February 28, or February 29 in a leap year. A `datetime` keeps its time and `tzinfo`.

## `age_in_days(start, end)`

Both arguments are aware `datetime` objects, possibly with different offsets. Return the number of whole 24-hour periods between the two instants as an `int`. Raise `ValueError` when either argument is naive or when `end` is earlier than `start`.
