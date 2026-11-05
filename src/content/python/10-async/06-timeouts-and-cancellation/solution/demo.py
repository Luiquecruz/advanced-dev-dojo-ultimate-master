import asyncio

from main import PENDING_COMMITS, shielded_commit, with_deadline, worker


async def slow_report() -> str:
    try:
        await asyncio.sleep(1)
        return "report"
    finally:
        print("  slow_report cleaned up")


async def main() -> None:
    try:
        await with_deadline(slow_report, 0.02)
    except TimeoutError:
        print("deadline: timed out")

    recorder: list[str] = []
    inbox: asyncio.Queue = asyncio.Queue()
    task = asyncio.create_task(worker(inbox, recorder))

    async def ok() -> str:
        return "invoice-1"

    async def broken() -> str:
        raise ValueError("missing customer")

    for job in (ok, broken, ok):
        inbox.put_nowait(job)
    await asyncio.sleep(0.01)
    task.cancel()
    await asyncio.gather(task, return_exceptions=True)
    print("worker:", recorder, "| cancelled:", task.cancelled())

    async def commit() -> str:
        await asyncio.sleep(0.02)
        print("  commit finished")
        return "saved"

    events: list[str] = []
    caller = asyncio.create_task(shielded_commit(commit, events))
    await asyncio.sleep(0.005)
    caller.cancel()
    await asyncio.gather(caller, return_exceptions=True)
    print("caller:", events, "| commits still running:", len(PENDING_COMMITS))
    await asyncio.sleep(0.04)
    print("after the commit:", len(PENDING_COMMITS))


if __name__ == "__main__":
    asyncio.run(main())
