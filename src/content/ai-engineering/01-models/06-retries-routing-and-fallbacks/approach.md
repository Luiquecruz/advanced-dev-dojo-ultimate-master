1. Start from error classification, because every later layer depends on it: availability failures (rate limit, server error, overload, timeout) may succeed later; a context-length error or a bug never will.
2. Compute the wait as a pure function of the attempt, the error and injected randomness. The server's retry-after hint wins over your formula; otherwise use capped exponential backoff with full jitter.
3. Write the retry loop so stopping is decided before waiting: the attempt limit and the classification both end the loop by rethrowing the latest error.
4. Layer the fallback on top of the retry loop instead of inside it: the primary gets its full retry budget, then a different failure domain gets its own. A non-retryable error skips the fallback, because it would fail there too.
5. Route with a mechanical check. The cheap tier answers first; any failure of the cheap tier (an error or a rejected answer) is a reason to escalate, but the escalated answer must pass the same validator before it is returned.
6. Report which model answered and whether the request escalated: those two fields become your escalation-rate and fallback-rate metrics in production.
