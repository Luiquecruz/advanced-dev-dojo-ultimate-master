import asyncio
from datetime import datetime, timezone

from dojo_ai import create_model
from dojo_ai.testing import fake_model, respond

from main import compact_json, create_audit_log, create_policy_decision_point, run_governed_tool_calls, verify_audit_chain

AGENTS = [
    {"id": "support-agent", "owner": "ana", "riskTier": "medium", "scopes": ["tickets:read", "tickets:write", "email:send"], "purposes": ["customer-support"], "clearance": "confidential", "status": "active"},
    {"id": "billing-agent", "owner": "bruno", "riskTier": "high", "scopes": ["invoices:read", "refunds:write"], "purposes": ["billing"], "clearance": "restricted", "status": "active"},
]

TOOLS = [
    {"name": "read_ticket", "scope": "tickets:read", "classification": "confidential", "sideEffect": "read"},
    {"name": "update_ticket", "scope": "tickets:write", "classification": "confidential", "sideEffect": "write"},
    {"name": "send_email", "scope": "email:send", "classification": "confidential", "sideEffect": "external"},
    {"name": "read_invoice", "scope": "invoices:read", "classification": "restricted", "sideEffect": "read"},
    {"name": "issue_refund", "scope": "refunds:write", "classification": "restricted", "sideEffect": "write"},
]

IMPLEMENTATIONS = {
    "read_ticket": lambda arguments: f"Ticket {arguments['id']}: customer asks for a refund of order 8812",
    "update_ticket": lambda arguments: f"Ticket {arguments['id']} set to {arguments['status']}",
    "read_invoice": lambda arguments: f"Invoice {arguments['id']}: 120.00 EUR, paid",
    "issue_refund": lambda arguments: "refund issued",
    "send_email": lambda arguments: "email sent",
}


class StepClock:
    """Returns a time 1.5 seconds later on every call."""

    def __init__(self, start):
        self.current = start

    def __call__(self):
        self.current += 1500
        return self.current


async def step(label, context, policy, audit):
    response = await create_model().generate({"messages": [{"role": "user", "content": label}]})
    messages = await run_governed_tool_calls(response, context, policy, audit, IMPLEMENTATIONS)
    print(f"{context['agentId']}: {label}")
    for call, message in zip(response["toolCalls"], messages):
        print(f"  {call['name']:<14} -> {message['content']}")


async def main():
    policy = create_policy_decision_point(agents=AGENTS, tools=TOOLS)
    audit = create_audit_log(now=StepClock(int(datetime(2026, 10, 31, 9, tzinfo=timezone.utc).timestamp() * 1000)))
    fake_model.reply(
        respond.tool_calls(
            [
                {"name": "read_ticket", "arguments": {"id": "T-1"}},
                {"name": "update_ticket", "arguments": {"id": "T-1", "status": "waiting-on-billing"}},
                {"name": "issue_refund", "arguments": {"order": "8812", "amount": 120}},
            ]
        ),
        respond.tool_calls(
            [
                {"name": "read_invoice", "arguments": {"id": "INV-8812"}},
                {"name": "issue_refund", "arguments": {"order": "8812", "amount": 120}},
            ]
        ),
        respond.tool_calls([{"name": "send_email", "arguments": {"to": "maria@example.com", "body": "Your refund is on the way."}}]),
        respond.tool_calls([{"name": "read_ticket", "arguments": {"id": "T-2"}}]),
    )

    await step("Handle ticket T-1 for Maria.", {"agentId": "support-agent", "purpose": "customer-support", "onBehalfOf": "customer-4411"}, policy, audit)
    await step("Refund order 8812.", {"agentId": "billing-agent", "purpose": "billing"}, policy, audit)
    await step("Tell Maria the refund is coming.", {"agentId": "support-agent", "purpose": "customer-support", "onBehalfOf": "customer-4411"}, policy, audit)
    policy.suspend("support-agent")
    print("kill switch: support-agent suspended")
    await step("Handle ticket T-2.", {"agentId": "support-agent", "purpose": "customer-support"}, policy, audit)

    entries = audit.entries()
    print(f"\naudit log: {len(entries)} entries")
    for entry in entries:
        event = entry["event"]
        print(f"  #{entry['sequence']} {entry['timestamp']} {event['agentId']:<13} {event['tool']:<14} {event['effect']:<5} {', '.join(event['reasons'])}  {entry['hash'][:12]}")
    print(f"chain check: {compact_json(verify_audit_chain(entries))}")

    tampered = audit.entries()
    tampered[2]["event"]["effect"] = "allow"
    print(f"after someone edits entry #2 to allow: {compact_json(verify_audit_chain(tampered))}")


if __name__ == "__main__":
    asyncio.run(main())
