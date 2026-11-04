import asyncio
import json

from dojo_ai import create_model
from dojo_ai.testing import fake_model, respond

from main import run_with_tools

ORDERS = {
    "A-1001": {"status": "shipped", "carrier": "ParcelGo", "eta": "2026-11-03"},
}


def get_order(arguments):
    order = ORDERS.get(str(arguments.get("orderId")))
    if order is None:
        raise LookupError(f"No order with id {arguments.get('orderId')}. Ask the customer to check the id.")
    return {"orderId": arguments["orderId"], **order}


TOOLS = [
    {
        "name": "get_order",
        "description": "Look up an order by its id (format A-1234). Returns status, carrier and estimated delivery date.",
        "parameters": {"type": "object", "properties": {"orderId": {"type": "string"}}, "required": ["orderId"]},
        "execute": get_order,
    },
]


def last_tool_result(request):
    last = request["messages"][-1]
    return last["content"] if last["role"] == "tool" else None


def describe(message):
    if message.get("toolCalls"):
        calls = ", ".join(f"{call['name']}({call['arguments']})" for call in message["toolCalls"])
        return f"assistant -> {calls}"
    return f"{message['role']:<9} {message['content']}"


def answer(request, context):
    result = last_tool_result(request)
    if result is None:
        return respond.text("How can I help?")
    order = json.loads(result)
    return respond.text(f"Good news: {order['status']}, arriving {order['eta']}.")


async def main():
    fake_model.reply(respond.invalid_tool_arguments("get_order"), respond.tool_call("get_order", {"orderId": "A-1001"}))
    fake_model.handle(answer)

    result = await run_with_tools(
        create_model(),
        messages=[
            {"role": "system", "content": "You are a support assistant. Use tools to answer order questions."},
            {"role": "user", "content": "Where is my order A-1001?"},
        ],
        tools=TOOLS,
    )
    for message in result["messages"]:
        print(describe(message))
    print(f"\nAnswered in {result['rounds']} model calls: {result['text']}")


if __name__ == "__main__":
    asyncio.run(main())
