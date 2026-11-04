import asyncio

from dojo_ai import create_model
from dojo_ai.testing import fake_model, respond

from main import run_agent

ORDERS = {
    "A-1001": {"status": "shipped", "total": 84.5, "shippedAt": "2026-10-27"},
    "A-1002": {"status": "processing", "total": 19.9},
}


def find_orders(arguments):
    return ["A-1001", "A-1002"] if arguments["email"] == "ana@example.com" else []


def get_order(arguments):
    order = ORDERS.get(str(arguments["orderId"]))
    if order is None:
        raise LookupError(f"order {arguments['orderId']} not found")
    return order


TOOLS = [
    {
        "name": "find_orders",
        "description": "List order ids for a customer email",
        "parameters": {"type": "object", "properties": {"email": {"type": "string"}}, "required": ["email"]},
        "execute": find_orders,
    },
    {
        "name": "get_order",
        "description": "Status, total and shipping date of one order",
        "parameters": {"type": "object", "properties": {"orderId": {"type": "string"}}, "required": ["orderId"]},
        "execute": get_order,
    },
]


def tool_results(request):
    return [message for message in request["messages"] if message["role"] == "tool"]


def support_reply(request, context):
    match len(tool_results(request)):
        case 0:
            return respond.tool_call("find_orders", {"email": "ana@example.com"})
        case 1:
            return respond.invalid_tool_arguments("get_order")
        case 2:
            return respond.tool_calls([
                {"name": "get_order", "arguments": {"orderId": "A-1001"}},
                {"name": "get_order", "arguments": {"orderId": "A-9999"}},
            ])
        case 4:
            return respond.unknown_tool("refund_order")
        case _:
            return respond.text("Order A-1001 shipped on 2026-10-27; order A-1002 is still being processed.")


def describe(message):
    if message["role"] == "assistant" and message.get("toolCalls"):
        calls = ", ".join(f"{call['name']}({call['arguments']})" for call in message["toolCalls"])
        return f"assistant -> {calls}"
    return f"{message['role']:<9} {message['content']}"


async def main():
    fake_model.handle(support_reply)
    result = await run_agent(
        create_model(),
        system="You are a support agent. Use the tools to answer questions about orders.",
        task="Where are my orders? My email is ana@example.com.",
        tools=TOOLS,
        max_steps=8,
    )
    print(f"status={result['status']} steps={result['steps']}\n")
    for message in result["messages"]:
        print(describe(message))

    fake_model.reset().handle(lambda request, context: respond.tool_call("find_orders", {"email": "ana@example.com"}))
    looping = await run_agent(create_model(), task="Where are my orders?", tools=TOOLS, max_steps=3)
    print(f"\nA model that never stops calling tools: status={looping['status']} after {looping['steps']} steps")


if __name__ == "__main__":
    asyncio.run(main())
