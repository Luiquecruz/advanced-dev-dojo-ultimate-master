class FakeClock:
    def __init__(self, now=0.0):
        self.now = now

    def __call__(self):
        return self.now


class Flaky:
    def __init__(self, failures, error=ConnectionError):
        self.failures = failures
        self.error = error
        self.calls = 0

    def __call__(self, *args, **kwargs):
        self.calls += 1
        if self.calls <= self.failures:
            raise self.error(f"attempt {self.calls}")
        return ("ok", args, kwargs)


def make_limited(clock, max_calls=2, period=10):
    @mod.rate_limit(max_calls, period, clock)
    def send(message):
        """Send one message."""
        return f"sent {message}"

    return send


@test("rate_limit allows max_calls inside the period and raises RateLimitError on the next call")
async def _():
    clock = FakeClock(100.0)
    send = make_limited(clock)
    first = send("a")
    clock.now = 105.0
    second = send("b")
    assert first == "sent a"
    assert second == "sent b"
    error = await capture_error(lambda: send("c"))
    assert isinstance(error, mod.RateLimitError)


@test("rate_limit frees capacity as the oldest calls leave the window")
async def _():
    clock = FakeClock(0.0)
    send = make_limited(clock)
    send("a")
    clock.now = 4.0
    send("b")
    clock.now = 10.0
    third = send("c")
    assert third == "sent c"
    clock.now = 13.0
    error = await capture_error(lambda: send("d"))
    assert isinstance(error, mod.RateLimitError)
    clock.now = 14.0
    fourth = send("d")
    assert fourth == "sent d"


@test("functions decorated by the same limiter keep separate windows and their metadata")
def _():
    clock = FakeClock(0.0)
    limiter = mod.rate_limit(1, 10, clock)

    @limiter
    def email(message):
        """Send one email."""
        return f"email {message}"

    @limiter
    def sms(message):
        return f"sms {message}"

    email("hi")
    result = sms("hi")
    assert result == "sms hi"
    separate = make_limited(clock, max_calls=1)
    other = separate("hi")
    assert other == "sent hi"
    assert email.__name__ == "email"
    assert email.__doc__ == "Send one email."


@test("retry retries listed exceptions and re-raises the last one after times attempts")
async def _():
    flaky = Flaky(failures=2)
    patient = mod.retry(times=3, exceptions=(ConnectionError,))(flaky)
    result = patient("orders", page=2)
    assert result == ("ok", ("orders",), {"page": 2})
    assert flaky.calls == 3
    broken = Flaky(failures=10)
    short = mod.retry(times=2)(broken)
    error = await capture_error(lambda: short())
    assert isinstance(error, ConnectionError)
    assert "attempt 2" in str(error)
    assert broken.calls == 2


@test("retry does not retry an exception outside the listed ones")
async def _():
    invalid = Flaky(failures=1, error=ValueError)
    guarded = mod.retry(times=5, exceptions=(ConnectionError,))(invalid)
    error = await capture_error(lambda: guarded())
    assert isinstance(error, ValueError)
    assert invalid.calls == 1


@test("retry works both bare and with arguments and keeps the function's metadata")
def _():
    flaky = Flaky(failures=2)

    @mod.retry
    def fetch():
        """Fetch the report."""
        return flaky()

    result = fetch()
    assert result[0] == "ok"
    assert flaky.calls == 3
    assert fetch.__name__ == "fetch"
    assert fetch.__doc__ == "Fetch the report."

    @mod.retry(times=2)
    def upload():
        return "uploaded"

    uploaded = upload()
    assert uploaded == "uploaded"
    assert upload.__wrapped__.__name__ == "upload"
