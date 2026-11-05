After `datetime.fromisoformat(text)`, check `moment.tzinfo is None or moment.utcoffset() is None` and raise `ValueError`. Then `moment.astimezone(timezone.utc)` converts the instant; `replace(tzinfo=...)` would only relabel the wall clock.
---
Count months from year zero: `divmod(value.year * 12 + value.month - 1 + months, 12)` gives the new year and a 0-based month. `calendar.monthrange(year, month)[1]` is the number of days of that month; clamp the day with `min`, then call `value.replace(year=..., month=..., day=...)`, which keeps the type, the time and the `tzinfo`.
---
Two aware datetimes subtract by instant. `(end - start) // timedelta(days=1)` counts whole 24-hour periods; check awareness and order first.
