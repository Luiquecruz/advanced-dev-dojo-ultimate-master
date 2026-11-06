A `datetime` is **aware** when its `tzinfo` gives a UTC offset, and **naive** otherwise. Only aware values name an instant; a naive one is a wall-clock reading with no place attached.

```py
from datetime import datetime, timedelta, timezone

sent = datetime.fromisoformat("2026-11-04T10:15:00-03:00")   # aware
sent.astimezone(timezone.utc)            # datetime(2026, 11, 4, 13, 15, tzinfo=timezone.utc)
datetime.fromisoformat("2026-11-04T10:15:00").tzinfo         # None: naive
datetime.now(timezone.utc)               # aware "now"; datetime.now() alone is naive local time
sent + timedelta(hours=36)               # timedelta: exact durations, never "months"
sent.strftime("%d/%m/%Y %H:%M")          # '04/11/2026 10:15'
```

## How it works

Python never guesses a zone for text that has none, and it has no "month" duration:

```py
datetime.fromisoformat("2026-11-04T10:15:00")          # naive: no instant at all
datetime(2026, 1, 31) + timedelta(days=30)             # March 2: thirty days is not a month
datetime(2026, 1, 31).replace(month=2)                 # ValueError: February 2026 has no day 31
```

Comparing a naive and an aware value with `<` raises `TypeError`, and `==` between them is simply `False`. Decide at the edge of the program: reject naive input, or attach the zone the sender really used.

- **Offsets and conversion**: `timezone.utc` (alias `datetime.UTC`) and `timezone(timedelta(hours=-3))` are fixed offsets. `astimezone(tz)` converts the same instant to another offset; `replace(tzinfo=tz)` only relabels the wall clock, which moves the instant. Aware values compare and subtract by instant whatever their offsets.
- **Parsing**: `fromisoformat` reads ISO 8601, including `Z`, and returns a naive value when the text has no offset. `strptime(text, format)` parses other layouts with an explicit format.
- **Durations**: subtracting two aware datetimes gives a `timedelta`; `delta // timedelta(days=1)` counts whole days, and `delta.days` floors negative durations (`timedelta(hours=-1).days == -1`).
- **Calendar months** need calendar logic: shift `year * 12 + month` with `divmod`, then clamp the day with `calendar.monthrange(year, month)[1]`, the number of days of that month.
- **Clocks are dependencies**: a function that calls `datetime.now()` inside cannot be tested at the end of a month. Take the current moment (or a `now` callable) as a parameter.

Named zones such as `America/Sao_Paulo` come from `zoneinfo.ZoneInfo`, which knows daylight-saving rules from the IANA database. A fixed offset does not: `-03:00` stays `-03:00` all year.

## Common mistakes

**Treating a month as thirty days.** `timedelta` only knows exact durations, so "one month later" computed with days drifts away from the calendar:

```py
# wrong: "one month" after January 31 lands on March 2
date(2026, 1, 31) + timedelta(days=30)          # date(2026, 3, 2)

# right: pick the target month, then clamp the day to that month's length
last_day = calendar.monthrange(2026, 2)[1]      # 28
date(2026, 1, 31).replace(month=2, day=min(31, last_day))   # date(2026, 2, 28)
```

**Assuming text without an offset is UTC.** `fromisoformat("2026-11-04T10:15:00")` is naive; attaching `timezone.utc` to it with `replace` moves the instant by the sender's real offset without any error.

## Security note

Timestamps from clients are input like any other: parse them with `fromisoformat` or `strptime` and an explicit format, reject naive values instead of guessing their zone, and never let a client's clock decide expiry or ordering on the server.

> **Status as of November 2026:** `datetime.UTC` exists since Python 3.11, when `fromisoformat` also started accepting most ISO 8601 text, including `Z`. `datetime.utcnow()` and `utcfromtimestamp()` are deprecated since 3.12 because they return naive values. Python 3.14 added `date.strptime()` and `time.strptime()`. Pyodide ships no IANA time zone data, so `zoneinfo.ZoneInfo("Europe/Paris")` raises `ZoneInfoNotFoundError` in this track and the lessons use fixed offsets.

## When to choose it

- **Aware UTC `datetime`** for storing, comparing and transmitting instants; convert to a local zone only for display.
- **`zoneinfo`** whenever local rules matter (business hours, daylight saving, scheduling in a city), on a system with time zone data.
- **`date`** for calendar facts without a time (birthdays, due dates), and calendar arithmetic for months and years.
- **`timedelta`** for exact durations (timeouts, ages in hours or days).
- **An injected clock** in any code whose result depends on "now".
