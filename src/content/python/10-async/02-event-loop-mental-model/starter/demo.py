import asyncio

from main import lazy_coroutine, run_concurrent, run_sequential


async def main() -> None:
    recorder: list[str] = []
    print("sequential:", await run_sequential(["users", "orders"], recorder))
    print("  events:", recorder)

    recorder = []
    print("concurrent:", await run_concurrent(["users", "orders"], recorder))
    print("  events:", recorder)

    recorder = []
    pending = lazy_coroutine(recorder)
    await asyncio.sleep(0)
    print("lazy, before await:", type(pending).__name__, recorder)
    print("lazy, after await:", await pending, recorder)


if __name__ == "__main__":
    asyncio.run(main())
