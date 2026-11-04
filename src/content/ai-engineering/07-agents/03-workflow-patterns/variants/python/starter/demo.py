import asyncio
import json
import time

from dojo_ai import create_model
from dojo_ai.testing import fake_model, respond

from main import GateError, evaluator_optimizer, parallel_sections, prompt_chain, route, vote

ROUTES = {
    "billing": {"description": "invoices, refunds and payments", "system": "You are the billing specialist."},
    "technical": {"description": "bugs, crashes and errors", "system": "You are the technical support engineer."},
    "general": {"description": "anything else", "system": "You are a friendly general assistant."},
}


def last_user_content(request):
    return next((message["content"] for message in reversed(request["messages"]) if message["role"] == "user"), "")


async def demo_routing():
    tickets = ["I was charged twice for my invoice", "The app crashes on export", "Do you have a dark mode?"]
    fake_model.reset().reply(
        respond.json({"route": "billing"}),
        respond.text("Billing here: the duplicate charge will be refunded."),
        respond.malformed_json({"route": "technical"}),
        respond.text("Happy to help with anything!"),
        respond.json({"route": "sales"}),
        respond.text("Dark mode is in Settings > Appearance."),
    )
    print("Routing")
    for ticket in tickets:
        result = await route(create_model(), ticket, ROUTES, "general")
        print(f"  {ticket:<36} -> {result['route']:<9} {result['text']}")


async def demo_chain():
    fake_model.reset().reply(respond.text("1. Problem 2. Fix 3. Next steps"), respond.text("Incident report: export crash fixed in 2.0.1."), respond.refusal())
    steps = [
        {"name": "outline", "prompt": lambda previous: f"Outline an incident report for: {previous}", "gate": lambda output: "1." in output},
        {"name": "write", "prompt": lambda previous: f"Write the report from this outline: {previous}"},
    ]
    result = await prompt_chain(create_model(), "export crash on 2.0.0", steps)
    print(f"\nPrompt chain: {len(result['outputs'])} steps -> {result['output']}")
    try:
        await prompt_chain(create_model(), "another incident", steps)
    except GateError as error:
        print(f'  second run stopped at gate "{error.step}" (reply: {error.output})')


async def demo_sections():
    fake_model.reset().configure(latency_ms=20)
    fake_model.handle(lambda request, context: respond.text(f"[{request['messages'][0]['content']}] done"))
    started_at = time.perf_counter()
    result = await parallel_sections(create_model(), "CONTRACT TEXT", [
        {"name": "summary", "instruction": "Summarize the contract."},
        {"name": "risks", "instruction": "List risky clauses."},
        {"name": "deadlines", "instruction": "List every deadline."},
    ])
    elapsed_ms = round((time.perf_counter() - started_at) * 1000)
    print(f"\nSectioning: three 20 ms calls finished in {elapsed_ms} ms (one after another they would take 60 ms or more)")
    for name, text in result.items():
        print(f"  {name:<10} {text}")


async def demo_voting():
    fake_model.reset().reply(
        respond.json({"label": "Spam"}),
        respond.json({"label": "spam "}),
        respond.malformed_json({"label": "ham"}),
        respond.json({"label": "ham"}),
        respond.error(503),
    )
    result = await vote(create_model(), "Is this spam? WIN A FREE PHONE", 5)
    print(f"\nVoting: verdict={result['verdict']} votes={json.dumps(result['votes'])} abstentions={result['abstentions']}")


async def demo_evaluator():
    drafts = 0

    def handler(request, context):
        nonlocal drafts
        if request.get("responseFormat", {}).get("type") == "json":
            if "v3" in last_user_content(request):
                return respond.json({"pass": True, "feedback": "Clear and complete."})
            return respond.json({"pass": False, "feedback": "Mention the breaking change."})
        drafts += 1
        return respond.text(f"Release note v{drafts}")

    fake_model.reset().handle(handler)
    result = await evaluator_optimizer(create_model(), "Write the release note for 2.0", 4)
    print(f'\nEvaluator-optimizer: accepted={result["accepted"]} after {result["rounds"]} rounds -> "{result["text"]}"')
    for index, feedback in enumerate(result["feedback"], start=1):
        print(f"  feedback {index}: {feedback}")
    print(f"  model calls: {len(fake_model.requests)}")


async def main():
    await demo_routing()
    await demo_chain()
    await demo_sections()
    await demo_voting()
    await demo_evaluator()


if __name__ == "__main__":
    asyncio.run(main())
