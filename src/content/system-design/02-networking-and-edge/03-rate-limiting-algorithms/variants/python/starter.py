import math


class TokenBucket:
    def __init__(self, *, capacity, refill_per_second, now):
        self._capacity = capacity
        self._refill_per_second = refill_per_second
        self._now = now
        self._tokens = capacity
        self._last = now()

    def try_remove(self, tokens=1):
        self._refill()
        if self._tokens < tokens:
            return False
        self._tokens -= tokens
        return True

    def available(self):
        self._refill()
        return self._tokens

    def _refill(self):
        # TODO: add the tokens earned since self._last, capped at the capacity, and move self._last to now
        pass


class SlidingWindowCounter:
    def __init__(self, *, limit, window_ms, now):
        self._limit = limit
        self._window_ms = window_ms
        self._now = now
        self._window_start = math.floor(now() / window_ms) * window_ms
        self._current = 0

    def allow(self):
        start = math.floor(self._now() / self._window_ms) * self._window_ms
        if start != self._window_start:
            self._window_start = start
            self._current = 0
        # TODO: keep the previous window's count and weight it by the part of it that still overlaps the sliding window
        if self._current >= self._limit:
            return False
        self._current += 1
        return True


if __name__ == "__main__":
    clock = 0
    bucket = TokenBucket(capacity=3, refill_per_second=1, now=lambda: clock)
    print([bucket.try_remove() for _ in range(4)])
    clock = 2_000
    print(bucket.available())

    limiter = SlidingWindowCounter(limit=2, window_ms=1_000, now=lambda: clock)
    print([limiter.allow() for _ in range(3)])
