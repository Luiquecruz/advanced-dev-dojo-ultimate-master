import asyncio


async def ticks(count):
    for _ in range(count):
        await asyncio.sleep(0)


def job(value, recorder=None, gate=None, error=None):
    async def run():
        await asyncio.sleep(0)
        if gate is not None:
            try:
                await gate.wait()
            except asyncio.CancelledError:
                recorder.append(f"job-cancelled:{value}")
                raise
        if error is not None:
            raise error
        return value

    return run


async def outcome_of(task):
    try:
        await task
    except asyncio.CancelledError:
        return "cancelled"
    return "finished"


@test("with_deadline returns the result when the work finishes in time")
async def _():
    async def quick():
        await asyncio.sleep(0)
        return 42

    result = await mod.with_deadline(quick, 1.0)
    assert result == 42


@test("with_deadline raises TimeoutError and cancels the unfinished work")
async def _():
    recorder = []

    async def never_answers():
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            recorder.append("work-cancelled")
            raise

    error = await capture_error(lambda: mod.with_deadline(never_answers, 0.02))
    kind = type(error).__name__
    assert kind == "TimeoutError"
    assert recorder == ["work-cancelled"]


@test("worker records each job, survives failing jobs and cleans up when cancelled while idle")
async def _():
    inbox = asyncio.Queue()
    recorder = []
    task = asyncio.create_task(mod.worker(inbox, recorder))
    for item in (job("a"), job("broken", error=ValueError("bad job")), job("b")):
        inbox.put_nowait(item)
    await ticks(20)
    task.cancel()
    outcome = await outcome_of(task)
    assert recorder == ["done:a", "failed:ValueError", "done:b", "cleanup"]
    assert outcome == "cancelled"


@test("cancelling the worker in the middle of a job stops it, cleans up and ends its task as cancelled")
async def _():
    inbox = asyncio.Queue()
    recorder = []
    gate = asyncio.Event()
    task = asyncio.create_task(mod.worker(inbox, recorder))
    inbox.put_nowait(job("slow", recorder, gate))
    inbox.put_nowait(job("next"))
    await ticks(5)
    task.cancel()
    await ticks(5)
    finished = task.done()
    cancelled = task.cancelled()
    assert finished
    assert cancelled
    assert recorder == ["job-cancelled:slow", "cleanup"]


@test("shielded_commit returns the commit result when the caller is not cancelled")
async def _():
    recorder = []
    result = await mod.shielded_commit(job("saved"), recorder)
    pending = len(mod.PENDING_COMMITS)
    assert result == "saved"
    assert recorder == []
    assert pending == 0


@test("cancelling the caller of shielded_commit lets the commit finish and keeps a reference to it meanwhile")
async def _():
    recorder = []
    gate = asyncio.Event()
    commits = []

    async def commit():
        await gate.wait()
        commits.append("committed")
        return "saved"

    caller = asyncio.create_task(mod.shielded_commit(commit, recorder))
    await ticks(3)
    caller.cancel()
    outcome = await outcome_of(caller)
    held = len(mod.PENDING_COMMITS)
    gate.set()
    await ticks(5)
    released = len(mod.PENDING_COMMITS)
    assert outcome == "cancelled"
    assert recorder == ["caller-cancelled"]
    assert commits == ["committed"]
    assert held == 1
    assert released == 0
