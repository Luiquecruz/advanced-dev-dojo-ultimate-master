import asyncio
import inspect


async def invoke(function, *args):
    """Calls a plain or an async function and returns its result, awaited when it is awaitable."""
    result = function(*args)
    if inspect.isawaitable(result):
        result = await result
    return result


async def run_saga(steps, context):
    completed = []
    for step in steps:
        try:
            await invoke(step["action"], context)
        except Exception:
            compensated, failed_compensations = await compensate(completed, context)
            return {
                "status": "compensated",
                "completed": [done["name"] for done in completed],
                "compensated": compensated,
                "failed_compensations": failed_compensations,
                "failed_step": step["name"],
            }
        completed.append(step)
    return {"status": "completed", "completed": [done["name"] for done in completed], "compensated": [], "failed_compensations": []}


async def compensate(completed, context):
    compensated = []
    failed_compensations = []
    for step in reversed(completed):
        try:
            await invoke(step["compensate"], context)
        except Exception:
            failed_compensations.append(step["name"])
        else:
            compensated.append(step["name"])
    return compensated, failed_compensations


def create_idempotent_handler(handler):
    executions = {}

    def forget_failure(key, execution):
        if execution.cancelled() or execution.exception() is not None:
            del executions[key]

    async def handle(key, request):
        execution = executions.get(key)
        if execution is None:
            execution = asyncio.create_task(invoke(handler, request))
            executions[key] = execution
            execution.add_done_callback(lambda finished: forget_failure(key, finished))
        return await asyncio.shield(execution)

    return handle


async def main():
    log = []

    def out_of_stock(context):
        raise RuntimeError("out of stock")

    result = await run_saga(
        [
            {"name": "create order", "action": lambda context: log.append("order created"), "compensate": lambda context: log.append("order cancelled")},
            {"name": "charge card", "action": lambda context: log.append("card charged"), "compensate": lambda context: log.append("payment refunded")},
            {"name": "reserve items", "action": out_of_stock, "compensate": lambda context: log.append("items released")},
        ],
        {"order_id": "o-1"},
    )
    print(result, log)

    charge = create_idempotent_handler(lambda amount: {"charge_id": f"ch-{amount}", "charged_at": len(log)})
    print(await charge("key-1", 40), await charge("key-1", 40))


if __name__ == "__main__":
    asyncio.run(main())
