import asyncio

PAGES = [["a", "b"], ["c"], ["d", "e"]]


def page_source(recorder, pages=PAGES):
    calls = []

    async def fetch_page(number):
        calls.append(number)
        recorder.append(f"fetch:{number}")
        await asyncio.sleep(0)
        if number <= len(pages):
            return pages[number - 1]
        return None

    return fetch_page, calls


async def numbers(recorder):
    try:
        for value in range(1, 100):
            recorder.append(f"yield:{value}")
            await asyncio.sleep(0)
            yield value
    finally:
        recorder.append("generator-closed")


@test("paginate yields every item of every page in order and stops at the first missing page")
async def _():
    fetch_page, calls = page_source([])
    items = [item async for item in mod.paginate(fetch_page)]
    assert items == ["a", "b", "c", "d", "e"]
    assert calls == [1, 2, 3, 4]


@test("paginate fetches the next page only after the consumer has used up the current one")
async def _():
    recorder = []
    fetch_page, _ = page_source(recorder)
    async for item in mod.paginate(fetch_page):
        recorder.append(f"item:{item}")
    assert recorder == ["fetch:1", "item:a", "item:b", "fetch:2", "item:c", "fetch:3", "item:d", "item:e", "fetch:4"]


@test("collect returns every item of an async generator when there is no limit")
async def _():
    fetch_page, _ = page_source([])
    items = await mod.collect(mod.paginate(fetch_page))
    assert items == ["a", "b", "c", "d", "e"]


# beginner mistake: break out of async for without aclosing, so the generator's finally has not run when collect returns
@test("collect with a limit stops pulling and closes the generator before it returns")
async def _():
    recorder = []
    generator = numbers(recorder)
    items = await mod.collect(generator, limit=3)
    closed_at_return = list(recorder)
    assert items == [1, 2, 3]
    assert closed_at_return == ["yield:1", "yield:2", "yield:3", "generator-closed"]


@test("AsyncConnection opens on enter, closes on exit and lets an error from the block propagate")
async def _():
    recorder = []

    async def use():
        async with mod.AsyncConnection(PAGES, recorder) as connection:
            recorder.append(f"inside:{connection.is_open}")
            raise ValueError("query failed")

    error = await capture_error(use)
    kind = type(error).__name__
    assert kind == "ValueError"
    assert recorder == ["open", "inside:True", "close"]


@test("AsyncConnection.fetch_page serves pages while open and refuses once closed")
async def _():
    recorder = []
    connection = mod.AsyncConnection(PAGES, recorder)
    async with connection:
        items = [item async for item in mod.paginate(connection.fetch_page)]
    error = await capture_error(lambda: connection.fetch_page(1))
    kind = type(error).__name__
    assert items == ["a", "b", "c", "d", "e"]
    assert kind == "RuntimeError"
    assert recorder == ["open", "close"]
