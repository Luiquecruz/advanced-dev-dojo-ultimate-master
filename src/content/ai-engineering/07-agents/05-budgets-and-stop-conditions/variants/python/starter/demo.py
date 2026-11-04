import asyncio
import json

from dojo_ai import create_model
from dojo_ai.testing import fake_model, respond

from main import run_budgeted_agent

clock = {"time": 0, "toolLatencyMs": 1000}


def search_docs(arguments):
    clock["time"] += clock["toolLatencyMs"]
    query = arguments["query"]
    page = arguments.get("page", 1)
    return {"query": query, "page": page, "hits": [f"Doc about {query}, page {page}"]}


TOOLS = [
    {
        "name": "search_docs",
        "description": "Search the product documentation",
        "parameters": {"type": "object", "properties": {"query": {"type": "string"}, "page": {"type": "number"}}, "required": ["query"]},
        "execute": search_docs,
    }
]

BUDGET = {"maxSteps": 8, "maxTokens": 5000, "maxCostUsd": 0.25, "maxDurationMs": 6000}


def report(scenario, result):
    usage = result["usage"]
    stop = result["stop"]
    print(f"{scenario:<22} {stop['reason']:<10} steps={usage['steps']} tokens={usage['totalTokens']:>4} cost=${usage['costUsd']:.4f} elapsed={result['elapsedMs']} ms")
    print(f"{'':<22} {stop['detail']}")


async def run(scenario, script, latency_ms=1000):
    clock["time"] = 0
    clock["toolLatencyMs"] = latency_ms
    fake_model.reset().configure(pricing={"inputPerMillion": 1000, "outputPerMillion": 1000})
    script()
    report(scenario, await run_budgeted_agent(create_model(), task="How do I rotate an API key?", tools=TOOLS, budget=BUDGET, now=lambda: clock["time"]))


def paging_through(query):
    page = 0

    def next_page(request, context):
        nonlocal page
        page += 1
        return respond.tool_call("search_docs", {"query": query, "page": page})

    return next_page


async def main():
    print(f"Budget: {json.dumps(BUDGET)}\n")
    await run("answers in 3 steps", lambda: fake_model.reply(
        respond.tool_call("search_docs", {"query": "api key"}),
        respond.tool_call("search_docs", {"query": "rotate key"}),
        respond.text("Open Settings > API keys and click Rotate."),
    ))
    await run("repeats the same call", lambda: fake_model.handle(lambda request, context: respond.tool_call("search_docs", {"query": "api key", "page": 1})))
    await run("keeps paging", lambda: fake_model.handle(paging_through("api key rotation and every related security setting")))
    await run("slow tools", lambda: fake_model.handle(paging_through("key")), 2500)


if __name__ == "__main__":
    asyncio.run(main())
