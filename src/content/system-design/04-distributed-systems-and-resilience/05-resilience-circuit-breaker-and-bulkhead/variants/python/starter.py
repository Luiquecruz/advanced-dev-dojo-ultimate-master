import asyncio


class CircuitBreaker:
    def __init__(self, *, failure_threshold, open_ms, now):
        self._failure_threshold = failure_threshold
        self._open_ms = open_ms
        self._now = now
        self._failures = 0

    def state(self):
        # TODO: report "open" while open_ms has not passed since the circuit opened, then "half-open"
        return "closed"

    async def call(self, fn):
        # TODO: while open (or while the half-open trial runs) raise RuntimeError("circuit open") without calling fn
        # TODO: in half-open, one trial: success closes the circuit, failure opens it again
        try:
            result = await fn()
        except Exception:
            self._failures += 1
            # TODO: open the circuit when the failure count reaches failure_threshold
            raise
        self._failures = 0
        return result


def backoff_delay(attempt, *, base_ms, cap_ms, random):
    # TODO: full jitter: random() times the exponential backoff base_ms * 2 ** attempt, capped at cap_ms, rounded down
    return base_ms


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
