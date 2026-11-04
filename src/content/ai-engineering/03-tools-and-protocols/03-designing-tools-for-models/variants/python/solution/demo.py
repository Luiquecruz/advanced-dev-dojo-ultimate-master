import asyncio
import json

from dojo_ai import create_model
from dojo_ai.testing import fake_model, respond

from main import search_orders


async def main():
    print("Definition the model sees:")
    print(json.dumps(search_orders.definition, indent=2))

    fake_model.reply(
        respond.tool_call("search_orders", {"email": "ada@example.com", "status": "in transit"}),
        respond.tool_call("search_orders", {"customerEmail": "ada@exmaple.com", "status": "shipped"}),
        respond.tool_call("search_orders", {"customerEmail": "ada@example.com", "status": "shipped"}),
        respond.text("You have two orders on the way: A-1010 and A-1009."),
    )

    model = create_model()
    messages = [{"role": "user", "content": "My email is ada@example.com. Which of my orders are on the way?"}]
    for round_number in range(1, 6):
        response = await model.generate({"messages": messages, "tools": [search_orders.definition]})
        if not response["toolCalls"]:
            print(f"\nFinal answer after {round_number} calls: {response['text']}")
            return
        messages.append({"role": "assistant", "content": response["text"], "toolCalls": response["toolCalls"]})
        for call in response["toolCalls"]:
            content = await search_orders.call(call["arguments"])
            print(f"\n{call['name']}({call['arguments']})\n{content}")
            messages.append({"role": "tool", "toolCallId": call["id"], "content": content})


if __name__ == "__main__":
    asyncio.run(main())
