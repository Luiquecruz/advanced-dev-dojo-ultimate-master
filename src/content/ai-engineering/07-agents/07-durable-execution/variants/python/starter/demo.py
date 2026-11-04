import asyncio
import json

from dojo_ai import create_model
from dojo_ai.testing import fake_model, respond

from main import create_checkpoint_store, run_durable_agent

payments_provider = {}
side_effects = []
documents = {}


def charge_card(arguments, context):
    key = context["idempotencyKey"]
    if key in payments_provider:
        side_effects.append(f"charge ${arguments['amount']} ignored by the provider (key {key} already used)")
    else:
        payments_provider[key] = arguments["amount"]
        side_effects.append(f"charged ${arguments['amount']} (key {key})")
    return {"charged": arguments["amount"]}


def reserve_stock(arguments, context):
    side_effects.append(f"reserved {arguments['sku']}")
    return {"reserved": arguments["sku"]}


TOOLS = [
    {
        "name": "charge_card",
        "description": "Charge the customer card; the provider deduplicates by idempotency key",
        "parameters": {"type": "object", "properties": {"amount": {"type": "number"}}},
        "execute": charge_card,
    },
    {
        "name": "reserve_stock",
        "description": "Reserve items in the warehouse",
        "parameters": {"type": "object", "properties": {"sku": {"type": "string"}}},
        "execute": reserve_stock,
    },
]


class CrashOnceAfterCharge:
    """Delegates to another store but dies on the first save that holds a tool result, like a worker killed by a deploy."""

    def __init__(self, inner):
        self.inner = inner
        self.crashed = False

    async def load(self, run_id):
        return await self.inner.load(run_id)

    async def save(self, checkpoint):
        if not self.crashed and any(message["role"] == "tool" for message in checkpoint["messages"]):
            self.crashed = True
            raise RuntimeError("the worker was killed by a deploy")
        await self.inner.save(checkpoint)


def tool_results(request):
    return len([message for message in request["messages"] if message["role"] == "tool"])


def fulfilment_reply(request, context):
    match tool_results(request):
        case 0:
            return respond.tool_call("charge_card", {"amount": 120})
        case 1:
            return respond.tool_call("reserve_stock", {"sku": "LAMP-01"})
        case _:
            return respond.text("Order paid and stock reserved.")


async def main():
    fake_model.handle(fulfilment_reply)
    options = {"run_id": "order-1042", "task": "Fulfil order 1042: charge $120 and reserve LAMP-01.", "tools": TOOLS, "max_steps": 6}

    try:
        await run_durable_agent(create_model(), store=CrashOnceAfterCharge(create_checkpoint_store(documents)), **options)
    except RuntimeError as error:
        print(f"Attempt 1 crashed: {error}")
    result = await run_durable_agent(create_model(), store=create_checkpoint_store(documents), **options)
    print(f'Attempt 2: status={result["status"]} resumed={result["resumed"]} steps={result["steps"]} answer="{result["answer"]}"\n')

    print("Side effects, in order:")
    for entry in side_effects:
        print(f"  {entry}")
    print(f"\nCharges recorded by the payment provider: {len(payments_provider)}")

    checkpoint = json.loads(documents["order-1042"])
    roles = " > ".join(message["role"] for message in checkpoint["messages"])
    print(f"Stored checkpoint: status={checkpoint['status']}, {len(checkpoint['messages'])} messages, roles {roles}")

    replay = await run_durable_agent(create_model(), store=create_checkpoint_store(documents), **options)
    print(f'Running the finished order again: answer="{replay["answer"]}", no new model calls ({len(fake_model.requests)} in total)')


if __name__ == "__main__":
    asyncio.run(main())
