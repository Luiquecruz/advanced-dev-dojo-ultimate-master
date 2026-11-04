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

## Coming from TypeScript and JavaScript

A JavaScript `Date` is always an instant, so the runtime silently picks a time zone when the text has none, and month arithmetic overflows into the next month:

```ts
new Date("2026-11-04T10:15:00");     // local time of whatever machine runs it
new Date("2026-11-04");              // midnight UTC: date-only text follows another rule
const d = new Date(2026, 0, 31);
d.setMonth(d.getMonth() + 1);        // March 3, 2026: "February 31" rolled over
```

```py
datetime.fromisoformat("2026-11-04T10:15:00")          # naive: no instant at all
datetime(2026, 1, 31) + timedelta(days=30)             # March 2: thirty days is not a month
datetime(2026, 1, 31).replace(month=2)                 # ValueError: day is out of range for month
```

The mistakes are assuming naive text is UTC (or local) and treating a month as 30 days. Python makes the first visible instead of guessing: comparing a naive and an aware value with `<` raises `TypeError`, and `==` between them is simply `False`. Decide at the edge: reject naive input, or attach the zone the sender really used.

## How it works

- **Offsets and conversion**: `timezone.utc` (alias `datetime.UTC`) and `timezone(timedelta(hours=-3))` are fixed offsets. `astimezone(tz)` converts the same instant to another offset; `replace(tzinfo=tz)` only relabels the wall clock, which moves the instant. Aware values compare and subtract by instant whatever their offsets.
- **Parsing**: `fromisoformat` reads ISO 8601, including `Z`, and returns a naive value when the text has no offset. `strptime(text, format)` parses other layouts with an explicit format.
- **Durations**: subtracting two aware datetimes gives a `timedelta`; `delta // timedelta(days=1)` counts whole days, and `delta.days` floors negative durations (`timedelta(hours=-1).days == -1`).
- **Calendar months** need calendar logic: shift `year * 12 + month` with `divmod`, then clamp the day with `calendar.monthrange(year, month)[1]`, the number of days of that month.
- **Clocks are dependencies**: a function that calls `datetime.now()` inside cannot be tested at the end of a month. Take the current moment (or a `now` callable) as a parameter.

Named zones such as `America/Sao_Paulo` come from `zoneinfo.ZoneInfo`, which knows daylight-saving rules from the IANA database. A fixed offset does not: `-03:00` stays `-03:00` all year.

## Security note

Timestamps from clients are input like any other: parse them with `fromisoformat` or `strptime` and an explicit format, reject naive values instead of guessing their zone, and never let a client's clock decide expiry or ordering on the server.

> **Status as of November 2026:** `datetime.UTC` exists since Python 3.11, when `fromisoformat` also started accepting most ISO 8601 text, including `Z`. `datetime.utcnow()` and `utcfromtimestamp()` are deprecated since 3.12 because they return naive values. Python 3.14 added `date.strptime()` and `time.strptime()`. Pyodide ships no IANA time zone data, so `zoneinfo.ZoneInfo("Europe/Paris")` raises `ZoneInfoNotFoundError` in this track and the lessons use fixed offsets.

## When to choose it

- **Aware UTC `datetime`** for storing, comparing and transmitting instants; convert to a local zone only for display.
- **`zoneinfo`** whenever local rules matter (business hours, daylight saving, scheduling in a city), on a system with time zone data.
- **`date`** for calendar facts without a time (birthdays, due dates), and calendar arithmetic for months and years.
- **`timedelta`** for exact durations (timeouts, ages in hours or days).
- **An injected clock** in any code whose result depends on "now".
