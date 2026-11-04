from datetime import date, datetime, timedelta, timezone

from main import add_months, age_in_days, to_utc

for text in ("2026-11-04T10:15:00-03:00", "2026-11-04T13:15:00Z", "2026-11-04T10:15:00"):
    try:
        print(f"{text} -> {to_utc(text).isoformat()}")
    except ValueError as error:
        print(f"{text} -> refused: {error}")

renewal = date(2026, 1, 31)
for months in range(1, 4):
    print(f"renewal {months} month(s) after {renewal}: {add_months(renewal, months)}")
print("thirty days after it:", renewal + timedelta(days=30))

signed_up = datetime(2026, 11, 1, 22, 0, tzinfo=timezone(timedelta(hours=-3)))
now = datetime(2026, 11, 3, 0, 30, tzinfo=timezone.utc)
print("account age in days:", age_in_days(signed_up, now), "| calendar dates apart:", (now.date() - signed_up.date()).days)
