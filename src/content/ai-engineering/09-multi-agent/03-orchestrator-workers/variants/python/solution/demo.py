import asyncio
import json

from dojo_ai import create_model
from dojo_ai.testing import fake_model, respond

from main import PLANNER_SYSTEM, WORKER_SYSTEM, orchestrate

QUESTION = "Which observability vendor should we pick: Beacon, Lumen or Prism? Compare pricing, retention and OpenTelemetry support."

PLAN = {
    "subtasks": [
        {"id": "beacon", "instruction": "Research Beacon: pricing per GB, retention options, OpenTelemetry support."},
        {"id": "lumen", "instruction": "Research Lumen: pricing per GB, retention options, OpenTelemetry support."},
        {"id": "prism", "instruction": "Research Prism: pricing per GB, retention options, OpenTelemetry support."},
    ],
}

FINDINGS = {
    "Beacon": "Beacon: $0.30 per GB, 30 days retention by default, native OTLP ingest.",
    "Prism": "Prism: $0.45 per GB, 90 days retention, OTLP through a collector add-on.",
}


def system_of(request):
    return next((message["content"] for message in request["messages"] if message["role"] == "system"), None)


def user_of(request):
    return next((message["content"] for message in request["messages"] if message["role"] == "user"), "")


async def main():
    plan_calls = 0

    def handler(request, context):
        nonlocal plan_calls
        if system_of(request) == PLANNER_SYSTEM:
            plan_calls += 1
            return respond.truncated(json.dumps(PLAN, separators=(",", ":")), 0.6) if plan_calls == 1 else respond.json(PLAN)
        if system_of(request) == WORKER_SYSTEM:
            vendor = next((name for name in FINDINGS if name in user_of(request)), None)
            return respond.error(503) if vendor is None else respond.slow(5, respond.text(FINDINGS[vendor]))
        return respond.text("Beacon is the cheapest with native OTLP; Prism keeps data longest. Lumen could not be researched and needs a follow-up.")

    fake_model.handle(handler)

    result = await orchestrate(QUESTION, model=create_model(), max_subtasks=5, concurrency=2, max_plan_attempts=2)

    print(f"planner calls: {plan_calls}")
    print(f"plan: {', '.join(subtask['id'] for subtask in result['plan'])}")
    for worker in result["results"]:
        print(f"  {worker['id']}: {worker['output'] if worker['status'] == 'ok' else 'failed (' + worker['error'] + ')'}")
    print(f"answer: {result['answer']}")
    usage = result["usage"]
    print(f"usage: {usage['calls']} calls, {usage['inputTokens']} input tokens, {usage['outputTokens']} output tokens, ${usage['cost']:.6f}")


if __name__ == "__main__":
    asyncio.run(main())
