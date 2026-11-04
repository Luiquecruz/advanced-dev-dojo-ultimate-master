import asyncio

from dojo_ai import create_model
from dojo_ai.testing import fake_model, respond

from main import run_swarm

AGENTS = {
    "triage": {"name": "triage", "instructions": "You are triage for a SaaS help desk. Route the customer to the right specialist.", "handoffs": ["billing", "tech"]},
    "billing": {"name": "billing", "instructions": "You are billing. Handle invoices, charges and plan changes.", "handoffs": ["refunds", "tech"]},
    "tech": {"name": "tech", "instructions": "You are tech support. Handle bugs, outages and integrations.", "handoffs": ["billing"]},
    "refunds": {"name": "refunds", "instructions": "You are refunds. Decide and issue refunds within policy.", "handoffs": []},
}


def report(title, result):
    print(title)
    for handoff in result["handoffs"]:
        print(f"  {handoff['from']} -> {handoff['to']} ({handoff['reason']})")
    print(f"  status: {result['status']}, final agent: {result['agent']}, turns: {result['turns']}")
    answer = "(none: escalate to a human with the transcript)" if result["answer"] is None else result["answer"]
    print(f"  answer: {answer}")


async def main():
    model = create_model()

    fake_model.reply(
        respond.tool_call("transfer_to_billing", {"reason": "customer reports a duplicate charge"}),
        respond.tool_call("transfer_to_refunds", {"reason": "duplicate charge confirmed on invoice INV-2031"}),
        respond.text("I refunded the duplicate charge of $49 on INV-2031; it will appear in 3 to 5 business days."),
    )
    report("Case 1: duplicate charge", await run_swarm("I was charged twice for my March invoice.", model=model, agents=AGENTS, entry="triage", max_handoffs=4, max_turns=8))

    fake_model.reset()
    fake_model.handle(lambda request, context: (
        respond.tool_call("transfer_to_tech", {"reason": "the charge failed because of a webhook error"})
        if request["messages"][0]["content"] == AGENTS["billing"]["instructions"]
        else respond.tool_call("transfer_to_billing", {"reason": "the webhook works; this is a payment question"})
    ))
    report("Case 2: unclear ownership", await run_swarm("My upgrade payment failed and the webhook log shows an error.", model=model, agents=AGENTS, entry="billing", max_handoffs=6, max_turns=10))


if __name__ == "__main__":
    asyncio.run(main())
