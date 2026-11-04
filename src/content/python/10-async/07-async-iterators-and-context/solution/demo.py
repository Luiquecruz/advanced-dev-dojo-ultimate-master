import asyncio

from main import AsyncConnection, collect, paginate

PAGES = [["alice", "bob"], ["carol"], ["dave", "erin"]]


async def main() -> None:
    recorder: list[str] = []
    async with AsyncConnection(PAGES, recorder) as connection:
        async for user in paginate(connection.fetch_page):
            recorder.append(f"user:{user}")
        first_two = await collect(paginate(connection.fetch_page), limit=2)
    print("events:", recorder)
    print("first two:", first_two)

    try:
        async with AsyncConnection(PAGES, recorder):
            raise ValueError("query failed")
    except ValueError as error:
        print("error propagated:", error, "| last event:", recorder[-1])

    try:
        await connection.fetch_page(1)
    except RuntimeError as error:
        print("after close:", error)


if __name__ == "__main__":
    asyncio.run(main())
