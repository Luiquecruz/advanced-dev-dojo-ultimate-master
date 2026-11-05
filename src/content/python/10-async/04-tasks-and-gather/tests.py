import asyncio


def source(name, steps, recorder, error=None):
    """An async source that records its start, waits `steps` ticks, records its end and returns or raises."""

    async def run():
        recorder.append(f"start:{name}")
        for _ in range(steps):
            await asyncio.sleep(0)
        recorder.append(f"end:{name}")
        if error is not None:
            raise error
        return name

    return run


async def ticks(name, steps, recorder):
    try:
        for _ in range(steps):
            await asyncio.sleep(0)
        return name
    except asyncio.CancelledError:
        recorder.append(f"cancelled:{name}")
        raise


async def stuck(name, recorder):
    try:
        await asyncio.Event().wait()
    except asyncio.CancelledError:
        recorder.append(f"cancelled:{name}")
        raise


def starts_before_first_end(recorder):
    first_end = next((index for index, event in enumerate(recorder) if event.startswith("end:")), len(recorder))
    return sum(1 for event in recorder[:first_end] if event.startswith("start:"))


@test("fetch_all runs every source at the same time and returns the values in input order")
async def _():
    recorder = []
    sources = [source("slow", 3, recorder), source("fast", 1, recorder), source("medium", 2, recorder)]
    values = await mod.fetch_all(sources)
    started = starts_before_first_end(recorder)
    assert values == ["slow", "fast", "medium"]
    assert started == 3


@test("fetch_all raises the error of a failing source")
async def _():
    recorder = []
    sources = [source("ok", 1, recorder), source("broken", 1, recorder, ValueError("bad payload"))]
    error = await capture_error(lambda: mod.fetch_all(sources))
    assert type(error).__name__ == "ValueError"
    assert "bad payload" in str(error)


@test("fetch_settled keeps every value and every error, each in input order, from concurrent sources")
async def _():
    recorder = []
    sources = [
        source("users", 2, recorder),
        source("prices", 1, recorder, ValueError("prices down")),
        source("stock", 3, recorder),
        source("reviews", 1, recorder, KeyError("reviews")),
    ]
    values, errors = await mod.fetch_settled(sources)
    error_types = [type(error).__name__ for error in errors]
    started = starts_before_first_end(recorder)
    assert values == ["users", "stock"]
    assert error_types == ["ValueError", "KeyError"]
    assert started == 4


@test("first_done returns the result of the coroutine that finishes first")
async def _():
    recorder = []
    result = await mod.first_done([ticks("slow", 5, recorder), ticks("quick", 1, recorder), stuck("stuck", recorder)])
    assert result == "quick"


# beginner mistake: returning the winner without cancelling and awaiting the pending tasks, so the losers keep running
@test("first_done cancels the other coroutines and waits for them before returning")
async def _():
    recorder = []
    result = await mod.first_done([stuck("primary", recorder), ticks("replica", 2, recorder), ticks("backup", 6, recorder)])
    cancelled = sorted(recorder)
    assert result == "replica"
    assert cancelled == ["cancelled:backup", "cancelled:primary"]
