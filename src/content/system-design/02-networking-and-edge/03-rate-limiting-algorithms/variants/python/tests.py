@test("a token bucket starts full, allows a burst up to its capacity and then rejects")
def _():
    clock = 1_000
    bucket = mod.TokenBucket(capacity=5, refill_per_second=1, now=lambda: clock)
    results = [bucket.try_remove() for _ in range(6)]
    assert results == [True, True, True, True, True, False]
    tokens = bucket.available()
    assert tokens == 0


@test("a token bucket refills lazily from the elapsed time, capped at its capacity")
def _():
    clock = 0
    bucket = mod.TokenBucket(capacity=4, refill_per_second=2, now=lambda: clock)
    removed = bucket.try_remove(4)
    assert removed is True
    clock = 250
    tokens = bucket.available()
    assert tokens == 0.5
    clock = 1_000
    tokens = bucket.available()
    assert tokens == 2
    removed = bucket.try_remove(3)
    assert removed is False
    removed = bucket.try_remove(2)
    assert removed is True
    clock = 60_000
    tokens = bucket.available()
    assert tokens == 4


@test("a sliding window counter allows the limit within a window and does not count rejected requests")
def _():
    clock = 0
    limiter = mod.SlidingWindowCounter(limit=3, window_ms=1_000, now=lambda: clock)
    results = [limiter.allow() for _ in range(5)]
    assert results == [True, True, True, False, False]
    clock = 1_500
    results = [limiter.allow() for _ in range(3)]
    assert results == [True, True, False]


# beginner mistake: a fixed window that resets at the boundary and lets a second full burst through
@test("the sliding window counter rejects the boundary burst a fixed window would allow")
def _():
    clock = 59_000
    limiter = mod.SlidingWindowCounter(limit=10, window_ms=60_000, now=lambda: clock)
    results = [limiter.allow() for _ in range(10)]
    assert results == [True] * 10
    clock = 60_000
    allowed = limiter.allow()
    assert allowed is False
    clock = 90_000
    results = [limiter.allow() for _ in range(6)]
    assert results == [True, True, True, True, True, False]


@test("the sliding window counter forgets the previous count after a whole idle window")
def _():
    clock = 0
    limiter = mod.SlidingWindowCounter(limit=4, window_ms=1_000, now=lambda: clock)
    for _ in range(4):
        limiter.allow()
    clock = 2_100
    results = [limiter.allow() for _ in range(5)]
    assert results == [True, True, True, True, False]
