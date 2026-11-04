import asyncio
import math

from dojo_ai import create_model
from dojo_ai.testing import fake_model, respond

from main import answer_with_tools, build_tool_index, definition_tokens
from servers import create_broken_server, create_company_servers


def offered_tools(request):
    return ", ".join(tool["name"] for tool in request.get("tools", []))


async def main():
    index = await build_tool_index([*create_company_servers(), {"id": "legacy", "server": create_broken_server()}])
    everything = index.definitions_for([tool["qualifiedName"] for tool in index.tools], math.inf)
    everything_tokens = sum(definition_tokens(definition) for definition in everything)
    print(f"Indexed {len(index.tools)} tools ({everything_tokens} tokens if all were sent on every call)")
    for failure in index.failures:
        print(f'Skipped server "{failure["serverId"]}": {failure["message"]}')
    print(f"Search \"refund an invoice\": {', '.join(tool['qualifiedName'] for tool in index.search('refund an invoice', 3))}")

    fake_model.reply(
        respond.tool_call("search_tools", {"query": "refund an invoice"}),
        respond.tool_call("billing__refund_invoice", {"invoice": "INV-1001", "reason": "arrived damaged"}),
        respond.text("Done: INV-1001 was refunded to your original payment method."),
    )
    result = await answer_with_tools(create_model(), index, "Please refund invoice INV-1001, it arrived damaged.", budget_tokens=300, search_limit=2)

    print("")
    requests = fake_model.requests
    for position, request in enumerate(requests, start=1):
        print(f"call {position} offered: {offered_tools(request)}")
    print(f"tool result: {requests[-1]['messages'][-1]['content']}")
    print(f"\nAnswer after {result['rounds']} rounds: {result['text']}")
    print(f"Loaded on demand: {', '.join(result['loadedTools'])}")


if __name__ == "__main__":
    asyncio.run(main())
