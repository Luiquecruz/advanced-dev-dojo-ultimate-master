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
            # TODO: compensate the completed steps in reverse order, keep going when a compensation raises
            return {"status": "compensated", "completed": completed, "compensated": [], "failed_compensations": [], "failed_step": step["name"]}
        completed.append(step["name"])
    return {"status": "completed", "completed": completed, "compensated": [], "failed_compensations": []}


def create_idempotent_handler(handler):
    # TODO: store the result by key so a retry with the same key does not run the handler again
    # TODO: forget the key when the handler fails, so a later retry runs it again
    async def handle(key, request):
        return await invoke(handler, request)

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
