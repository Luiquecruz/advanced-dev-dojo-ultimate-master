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
        now_ms = self._now()
        self._tokens = min(self._capacity, self._tokens + (now_ms - self._last) * self._refill_per_second / 1000)
        self._last = now_ms


class SlidingWindowCounter:
    def __init__(self, *, limit, window_ms, now):
        self._limit = limit
        self._window_ms = window_ms
        self._now = now
        self._window_start = self._start_of(now())
        self._current = 0
        self._previous = 0

    def allow(self):
        now_ms = self._now()
        start = self._start_of(now_ms)
        if start != self._window_start:
            self._previous = self._current if start - self._window_start == self._window_ms else 0
            self._current = 0
            self._window_start = start
        estimate = self._previous * (self._window_ms - (now_ms - start)) / self._window_ms + self._current
        if estimate >= self._limit:
            return False
        self._current += 1
        return True

    def _start_of(self, now_ms):
        return math.floor(now_ms / self._window_ms) * self._window_ms


if __name__ == "__main__":
    clock = 0
    bucket = TokenBucket(capacity=3, refill_per_second=1, now=lambda: clock)
    print([bucket.try_remove() for _ in range(4)])
    clock = 2_000
    print(bucket.available())

    limiter = SlidingWindowCounter(limit=2, window_ms=1_000, now=lambda: clock)
    print([limiter.allow() for _ in range(3)])
