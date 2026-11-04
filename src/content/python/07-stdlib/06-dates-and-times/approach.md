1. For every input, ask whether it names an instant (aware) or a wall-clock reading (naive), and decide what each function does with naive values: here, refuse them.
2. Write `to_utc` so the parsed offset is used, not overwritten. Check that `-03:00`, `Z` and `+05:30` versions of the same moment all end at 13:15 UTC.
3. Write down what "one month later" means for January 31, March 31 and a leap February before coding `add_months`; the answer is calendar arithmetic plus a clamp, never a fixed number of days.
4. Try negative month counts that cross a year boundary, and a `datetime` with an offset, to confirm the type, time and `tzinfo` survive.
5. For `age_in_days`, pick an evening in one offset and a night in another two calendar dates later and count the hours by hand; the result must follow the hours, not the dates.
