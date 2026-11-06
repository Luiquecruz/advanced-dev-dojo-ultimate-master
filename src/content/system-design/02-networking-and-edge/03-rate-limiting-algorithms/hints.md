Neither limiter needs a timer: on every call, first bring the state up to date from the time that passed since the last call, then decide. For the token bucket that means turning elapsed milliseconds into tokens; for the sliding window counter it means noticing that the window changed.
---
For the token bucket, `refill()` reads `now()` once, adds `(time - last) * refillPerSecond / 1000` tokens, caps with `Math.min(capacity, ...)` and stores `last = time`. For the sliding window counter, add a `previous` variable next to `current`: when the window start changes, a move of exactly `windowMs` makes the old current count `previous`, and a bigger move means `previous = 0`.
---
After rolling the windows, weight the previous count by the part of it that still overlaps: `previous * (windowMs - (time - start)) / windowMs + current`. Reject when that estimate is `>= limit`, and increment `current` only for accepted requests.
