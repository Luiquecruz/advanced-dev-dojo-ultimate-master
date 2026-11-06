import asyncio


def recording_step(name, log, fails=False, compensation_fails=False):
    def action(context):
        log.append(f"do {name} {context['order_id']}")
        if fails:
            raise RuntimeError(f"{name} failed")

    async def compensate(context):
        log.append(f"undo {name} {context['order_id']}")
        if compensation_fails:
            raise RuntimeError(f"undo {name} failed")

    return {"name": name, "action": action, "compensate": compensate}


async def ticks(count=10):
    """Lets every task that is ready run, `count` times over."""
    for _ in range(count):
        await asyncio.sleep(0)


@test("the saga runs every action in order with the context and reports completed")
async def _():
    log = []
    result = await mod.run_saga([recording_step("order", log), recording_step("payment", log), recording_step("inventory", log)], {"order_id": "o-1"})
    assert log == ["do order o-1", "do payment o-1", "do inventory o-1"]
    assert result["status"] == "completed"
    assert result["completed"] == ["order", "payment", "inventory"]
    assert result["compensated"] == []
    assert result["failed_compensations"] == []
    assert result.get("failed_step") is None


# beginner mistake: compensating in forward order, compensating the failed step or running the steps after it
@test("a failing step stops the saga and compensates only the completed steps, in reverse order")
async def _():
    log = []
    steps = [recording_step("order", log), recording_step("payment", log), recording_step("inventory", log, fails=True), recording_step("shipping", log)]
    result = await mod.run_saga(steps, {"order_id": "o-2"})
    assert log == ["do order o-2", "do payment o-2", "do inventory o-2", "undo payment o-2", "undo order o-2"]
    assert result["status"] == "compensated"
    assert result["failed_step"] == "inventory"
    assert result["completed"] == ["order", "payment"]
    assert result["compensated"] == ["payment", "order"]
    assert result["failed_compensations"] == []


@test("a failing compensation is reported and the remaining compensations still run")
async def _():
    log = []
    steps = [recording_step("order", log), recording_step("payment", log, compensation_fails=True), recording_step("inventory", log), recording_step("shipping", log, fails=True)]
    result = await mod.run_saga(steps, {"order_id": "o-3"})
    assert log[4:] == ["undo inventory o-3", "undo payment o-3", "undo order o-3"]
    assert result["status"] == "compensated"
    assert result["compensated"] == ["inventory", "order"]
    assert result["failed_compensations"] == ["payment"]


@test("the idempotent handler returns the stored result for a repeated key without running the handler again")
async def _():
    calls = []

    async def handler(amount):
        calls.append(amount)
        return {"charge_id": f"ch-{len(calls)}", "amount": amount}

    charge = mod.create_idempotent_handler(handler)
    first = await charge("key-1", 40)
    repeated = await charge("key-1", 40)
    assert repeated == first
    assert len(calls) == 1
    other_key = await charge("key-2", 40)
    assert other_key == {"charge_id": "ch-2", "amount": 40}
    assert len(calls) == 2


@test("concurrent retries share one execution and a failed attempt is not stored")
async def _():
    released = asyncio.Event()
    calls = []

    async def slow_charge(request):
        calls.append(request)
        await released.wait()
        return "done"

    charge = mod.create_idempotent_handler(slow_charge)
    first = asyncio.create_task(charge("key-1", "request"))
    retry = asyncio.create_task(charge("key-1", "request"))
    await ticks()
    released.set()
    results = await asyncio.gather(first, retry)
    assert results == ["done", "done"]
    assert len(calls) == 1

    attempts = []

    async def flaky(request):
        attempts.append(request)
        if len(attempts) == 1:
            raise ConnectionError("timeout")
        return "ok"

    send = mod.create_idempotent_handler(flaky)
    error = await capture_error(send("key-9", "request"))
    assert str(error) == "timeout"
    retried = await send("key-9", "request")
    assert retried == "ok"
    assert len(attempts) == 2
