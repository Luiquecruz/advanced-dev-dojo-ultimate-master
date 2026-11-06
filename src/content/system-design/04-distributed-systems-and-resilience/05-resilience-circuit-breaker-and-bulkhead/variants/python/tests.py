import asyncio


class Clock:
    def __init__(self):
        self.time = 0

    def now(self):
        return self.time

    def advance(self, ms):
        self.time += ms


class Dependency:
    """An async dependency that counts how many times it is called and answers with a fixed result or a ConnectionError."""

    def __init__(self, result=None, error=None):
        self.result = result
        self.error = error
        self.calls = 0

    def __call__(self):
        self.calls += 1
        return self._reply()

    async def _reply(self):
        if self.error is not None:
            raise ConnectionError(self.error)
        return self.result


def failing():
    return Dependency(error="timeout")


def answering(result):
    return Dependency(result=result)


@test("closed passes results and errors through, and only consecutive failures open the circuit")
async def _():
    clock = Clock()
    breaker = mod.CircuitBreaker(failure_threshold=3, open_ms=1_000, now=clock.now)
    initial_state = breaker.state()
    assert initial_state == "closed"
    result = await breaker.call(answering("ok"))
    assert result == "ok"
    down = failing()
    first = await capture_error(breaker.call(down))
    assert str(first) == "timeout"
    second = await capture_error(breaker.call(down))
    assert str(second) == "timeout"
    await breaker.call(answering("ok"))
    await capture_error(breaker.call(down))
    await capture_error(breaker.call(down))
    state_after_two_failures = breaker.state()
    assert state_after_two_failures == "closed"
    third = await capture_error(breaker.call(down))
    assert str(third) == "timeout"
    state_after_three_failures = breaker.state()
    assert state_after_three_failures == "open"
    assert down.calls == 5


@test('open fails fast with "circuit open" without calling the dependency until the open period has passed')
async def _():
    clock = Clock()
    breaker = mod.CircuitBreaker(failure_threshold=2, open_ms=1_000, now=clock.now)
    await capture_error(breaker.call(failing()))
    await capture_error(breaker.call(failing()))
    dependency = answering("ok")
    clock.advance(999)
    error = await capture_error(breaker.call(dependency))
    assert str(error) == "circuit open"
    assert dependency.calls == 0
    state_before = breaker.state()
    assert state_before == "open"
    clock.advance(1)
    state_after = breaker.state()
    assert state_after == "half-open"


@test("half-open allows one trial at a time and a successful trial closes the circuit")
async def _():
    clock = Clock()
    breaker = mod.CircuitBreaker(failure_threshold=1, open_ms=500, now=clock.now)
    await capture_error(breaker.call(failing()))
    clock.advance(500)
    released = asyncio.Event()

    async def slow_recovery():
        await released.wait()
        return "recovered"

    trial = asyncio.create_task(breaker.call(slow_recovery))
    # one step of the event loop: the trial runs until its first real wait, like a call that has just started
    await asyncio.sleep(0)
    other = answering("other")
    error = await capture_error(breaker.call(other))
    assert str(error) == "circuit open"
    assert other.calls == 0
    released.set()
    recovered = await trial
    assert recovered == "recovered"
    state = breaker.state()
    assert state == "closed"
    answer = await breaker.call(other)
    assert answer == "other"


@test("a failed trial opens the circuit again for another open period")
async def _():
    clock = Clock()
    breaker = mod.CircuitBreaker(failure_threshold=2, open_ms=1_000, now=clock.now)
    await capture_error(breaker.call(failing()))
    await capture_error(breaker.call(failing()))
    clock.advance(1_000)
    trial_error = await capture_error(breaker.call(failing()))
    assert str(trial_error) == "timeout"
    state_after_trial = breaker.state()
    assert state_after_trial == "open"
    clock.advance(999)
    refused = await capture_error(breaker.call(answering("ok")))
    assert str(refused) == "circuit open"
    clock.advance(1)
    result = await breaker.call(answering("ok"))
    assert result == "ok"
    state = breaker.state()
    assert state == "closed"


# beginner mistake: retrying immediately or after a constant delay instead of exponential backoff with a cap and full jitter
@test("the backoff delay grows exponentially, is capped and is scaled by random()")
def _():
    def delay(attempt, value):
        return mod.backoff_delay(attempt, base_ms=100, cap_ms=2_000, random=lambda: value)

    growing = [delay(attempt, 0.999_999) for attempt in [0, 1, 2, 3, 4]]
    assert growing == [99, 199, 399, 799, 1_599]
    capped = delay(5, 0.999_999)
    assert capped == 1_999
    long_after_the_cap = delay(12, 0.5)
    assert long_after_the_cap == 1_000
    quarter = delay(3, 0.25)
    assert quarter == 200
    zero = delay(3, 0)
    assert zero == 0
