import asyncio


async def ticks(count):
    for _ in range(count):
        await asyncio.sleep(0)


@test("fetch records its start, lets other tasks run, then records its end")
async def _():
    recorder = []
    task = asyncio.create_task(mod.fetch("a", recorder))
    await asyncio.sleep(0)
    midway = list(recorder)
    result = await task
    assert midway == ["start:a"]
    assert recorder == ["start:a", "end:a"]
    assert result == "data:a"


@test("run_sequential finishes each fetch before starting the next and keeps the input order")
async def _():
    recorder = []
    results = await mod.run_sequential(["a", "b", "c"], recorder)
    assert results == ["data:a", "data:b", "data:c"]
    assert recorder == ["start:a", "end:a", "start:b", "end:b", "start:c", "end:c"]


@test("run_concurrent starts every fetch before the first one ends and keeps the input order")
async def _():
    recorder = []
    results = await mod.run_concurrent(["a", "b", "c"], recorder)
    empty = await mod.run_concurrent([], [])
    assert results == ["data:a", "data:b", "data:c"]
    assert recorder == ["start:a", "start:b", "start:c", "end:a", "end:b", "end:c"]
    assert empty == []


@test("lazy_coroutine returns a coroutine that runs nothing until it is awaited")
async def _():
    recorder = []
    pending = mod.lazy_coroutine(recorder)
    kind = type(pending).__name__
    await ticks(3)
    before = list(recorder)
    result = await pending
    assert kind == "coroutine"
    assert before == []
    assert result == "data:lazy"
    assert recorder == ["start:lazy", "end:lazy"]
