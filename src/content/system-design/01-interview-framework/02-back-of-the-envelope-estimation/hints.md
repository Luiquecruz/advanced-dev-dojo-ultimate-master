Start from the day: `requestsPerDay = dailyActiveUsers * requestsPerUserPerDay`. Every QPS value is "something per day" divided by `SECONDS_PER_DAY` (86,400), never by 3,600 (seconds in an hour) or 1,440 (minutes in a day).
---
Keep `requestsPerDay` unrounded and derive each QPS from it with its own `Math.ceil`: `Math.ceil((requestsPerDay * input.peakFactor) / SECONDS_PER_DAY)`. Rounding the average first and then multiplying gives `2316` instead of `2315` in the tests.
---
Round the writes per day once with `Math.round(requestsPerDay * input.writeRatio)` (it is a count, and `0.1` is not exact in floating point), then multiply it by bytes, days and replicas. For `formatBytes`, loop with `while (value >= 1000 && unit < UNITS.length - 1)`, then round with `Math.round(value * 10) / 10`, which rounds half up to one decimal; a whole number prints without `.0`.
