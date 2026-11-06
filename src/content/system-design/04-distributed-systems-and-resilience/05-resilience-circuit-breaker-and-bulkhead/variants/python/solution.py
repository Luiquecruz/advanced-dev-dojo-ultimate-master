import asyncio
import math


class CircuitBreaker:
    def __init__(self, *, failure_threshold, open_ms, now):
        self._failure_threshold = failure_threshold
        self._open_ms = open_ms
        self._now = now
        self._failures = 0
        self._opened_at = None
        self._trial_running = False

    def state(self):
        if self._opened_at is None:
            return "closed"
        return "half-open" if self._now() - self._opened_at >= self._open_ms else "open"

    async def call(self, fn):
        current = self.state()
        if current == "open" or (current == "half-open" and self._trial_running):
            raise RuntimeError("circuit open")
        if current == "half-open":
            return await self._trial(fn)
        try:
            result = await fn()
        except Exception:
            self._failures += 1
            if self._failures >= self._failure_threshold:
                self._open()
            raise
        self._failures = 0
        return result

    async def _trial(self, fn):
        self._trial_running = True
        try:
            result = await fn()
        except Exception:
            self._open()
            raise
        finally:
            self._trial_running = False
        self._opened_at = None
        return result

    def _open(self):
        self._opened_at = self._now()
        self._failures = 0


def backoff_delay(attempt, *, base_ms, cap_ms, random):
    return math.floor(random() * min(cap_ms, base_ms * 2**attempt))


async def main():
    current_ms = 0
    breaker = CircuitBreaker(failure_threshold=2, open_ms=1_000, now=lambda: current_ms)

    async def failing():
        raise ConnectionError("timeout")

    async def recovered():
        return "recovered"

    for attempt in range(3):
        try:
            await breaker.call(failing)
        except Exception as error:
            print(attempt, error, breaker.state())
    current_ms = 1_000
    print(breaker.state(), await breaker.call(recovered), breaker.state())
    print([backoff_delay(attempt, base_ms=100, cap_ms=2_000, random=lambda: 0.5) for attempt in range(6)])


if __name__ == "__main__":
    asyncio.run(main())
