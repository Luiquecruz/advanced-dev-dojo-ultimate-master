import hashlib
import json
import re
from datetime import datetime, timezone

from dojo_ai import create_model

AGENTS = [
    {"id": "support-agent", "owner": "ana", "riskTier": "medium", "scopes": ["tickets:read", "tickets:write", "email:send"], "purposes": ["customer-support"], "clearance": "confidential", "status": "active"},
    {"id": "billing-agent", "owner": "bruno", "riskTier": "high", "scopes": ["invoices:read", "refunds:write"], "purposes": ["billing"], "clearance": "restricted", "status": "active"},
    {"id": "reporting-agent", "owner": "carla", "riskTier": "low", "scopes": ["tickets:read"], "purposes": ["analytics"], "clearance": "internal", "status": "active"},
    {"id": "old-agent", "owner": "carla", "riskTier": "low", "scopes": ["tickets:read"], "purposes": ["analytics"], "clearance": "restricted", "status": "suspended"},
]

TOOLS = [
    {"name": "read_ticket", "scope": "tickets:read", "classification": "confidential", "sideEffect": "read"},
    {"name": "update_ticket", "scope": "tickets:write", "classification": "confidential", "sideEffect": "write"},
    {"name": "send_email", "scope": "email:send", "classification": "confidential", "sideEffect": "external"},
    {"name": "read_invoice", "scope": "invoices:read", "classification": "restricted", "sideEffect": "read"},
    {"name": "issue_refund", "scope": "refunds:write", "classification": "restricted", "sideEffect": "write"},
]

START = int(datetime(2026, 10, 31, 9, tzinfo=timezone.utc).timestamp() * 1000)


def pdp():
    return mod.create_policy_decision_point(agents=[dict(agent) for agent in AGENTS], tools=TOOLS)


def parses(text):
    try:
        json.loads(text)
        return True
    except ValueError:
        return False


def compact_json(value):
    return json.dumps(value, separators=(",", ":"), ensure_ascii=False)


def sha256(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def contains(record, expected):
    return all(key in record and record[key] == value for key, value in expected.items())


class Clock:
    """Returns `start` on the first call and `step` milliseconds more on every later call."""

    def __init__(self, start=START, step=1000):
        self.current = start - step
        self.step = step

    def __call__(self):
        self.current += self.step
        return self.current


@test("allows a call within the agent scopes, purposes and clearance, echoing who asked and for whom")
def _():
    policy = pdp()
    assert policy.decide({"agentId": "support-agent", "tool": "read_ticket", "purpose": "customer-support", "onBehalfOf": "customer-4411"}) == {
        "agentId": "support-agent",
        "tool": "read_ticket",
        "purpose": "customer-support",
        "onBehalfOf": "customer-4411",
        "effect": "allow",
        "reasons": ["within-policy"],
    }
    assert contains(policy.decide({"agentId": "support-agent", "tool": "update_ticket", "purpose": "customer-support"}), {"effect": "allow", "reasons": ["within-policy"]})
    assert contains(policy.decide({"agentId": "billing-agent", "tool": "read_invoice", "purpose": "billing"}), {"effect": "allow"})


@test("denies unknown agents, suspended agents and unknown tools, and suspend() works as a kill switch")
def _():
    policy = pdp()
    assert contains(policy.decide({"agentId": "ghost-agent", "tool": "read_ticket", "purpose": "analytics"}), {"effect": "deny", "reasons": ["unknown-agent"]})
    assert contains(policy.decide({"agentId": "old-agent", "tool": "read_ticket", "purpose": "analytics"}), {"effect": "deny", "reasons": ["agent-suspended"]})
    assert contains(policy.decide({"agentId": "support-agent", "tool": "drop_database", "purpose": "customer-support"}), {"effect": "deny", "reasons": ["unknown-tool"]})
    assert policy.suspend("support-agent") is True
    assert contains(policy.decide({"agentId": "support-agent", "tool": "read_ticket", "purpose": "customer-support"}), {"effect": "deny", "reasons": ["agent-suspended"]})
    assert policy.suspend("ghost-agent") is False
    assert pdp().decide({"agentId": "support-agent", "tool": "read_ticket", "purpose": "customer-support"})["effect"] == "allow"


@test("collects every deny reason: missing scope, purpose not allowed, classification above clearance")
def _():
    policy = pdp()
    assert contains(policy.decide({"agentId": "reporting-agent", "tool": "read_ticket", "purpose": "analytics"}), {"effect": "deny", "reasons": ["above-clearance"]})
    assert contains(policy.decide({"agentId": "support-agent", "tool": "read_ticket", "purpose": "marketing"}), {"effect": "deny", "reasons": ["purpose-not-allowed"]})
    assert contains(policy.decide({"agentId": "reporting-agent", "tool": "issue_refund", "purpose": "billing"}), {"effect": "deny", "reasons": ["missing-scope", "purpose-not-allowed", "above-clearance"]})


@test("asks a human for external side effects and high-risk writes, so the same tool depends on the agent identity")
def _():
    policy = pdp()
    assert contains(policy.decide({"agentId": "support-agent", "tool": "send_email", "purpose": "customer-support"}), {"effect": "ask", "reasons": ["external-side-effect"]})
    assert contains(policy.decide({"agentId": "billing-agent", "tool": "issue_refund", "purpose": "billing"}), {"effect": "ask", "reasons": ["high-risk-write"]})
    effects = [policy.decide({"agentId": agent_id, "tool": "read_ticket", "purpose": "customer-support"})["effect"] for agent_id in ["support-agent", "reporting-agent", "billing-agent"]]
    assert effects == ["allow", "deny", "deny"]


@test("the audit log chains every entry to the previous one with a sha256 hash and hands out copies")
def _():
    audit = mod.create_audit_log(now=Clock())
    first = audit.append({"type": "tool-decision", "agentId": "support-agent", "effect": "allow"})
    second = audit.append({"type": "tool-decision", "agentId": "billing-agent", "effect": "ask"})
    assert contains(first, {"sequence": 0, "timestamp": "2026-10-31T09:00:00.000Z", "previousHash": mod.GENESIS_HASH})
    assert first["hash"] == sha256(compact_json([0, "2026-10-31T09:00:00.000Z", mod.GENESIS_HASH, {"type": "tool-decision", "agentId": "support-agent", "effect": "allow"}]))
    assert contains(second, {"sequence": 1, "timestamp": "2026-10-31T09:00:01.000Z", "previousHash": first["hash"]})
    assert second["hash"] == sha256(compact_json([1, "2026-10-31T09:00:01.000Z", first["hash"], {"type": "tool-decision", "agentId": "billing-agent", "effect": "ask"}]))
    copy = audit.entries()
    copy[0]["event"]["effect"] = "deny"
    copy.pop()
    assert len(audit.entries()) == 2
    assert audit.entries()[0]["event"]["effect"] == "allow"


@test("verify_audit_chain finds edited, re-hashed, deleted and reordered entries")
def _():
    audit = mod.create_audit_log(now=Clock())
    for index, effect in enumerate(["allow", "deny", "ask", "allow"]):
        audit.append({"type": "tool-decision", "index": index, "effect": effect})
    assert mod.verify_audit_chain(audit.entries()) == {"valid": True}
    assert mod.verify_audit_chain([]) == {"valid": True}

    edited = audit.entries()
    edited[1]["event"]["effect"] = "allow"
    assert mod.verify_audit_chain(edited) == {"valid": False, "brokenAt": 1}

    rehashed = audit.entries()
    rehashed[1]["event"]["effect"] = "allow"
    rehashed[1]["hash"] = sha256(compact_json([1, rehashed[1]["timestamp"], rehashed[1]["previousHash"], rehashed[1]["event"]]))
    assert mod.verify_audit_chain(rehashed) == {"valid": False, "brokenAt": 2}

    deleted = audit.entries()
    del deleted[2]
    assert mod.verify_audit_chain(deleted) == {"valid": False, "brokenAt": 2}

    reordered = audit.entries()
    reordered[0], reordered[1] = reordered[1], reordered[0]
    assert mod.verify_audit_chain(reordered) == {"valid": False, "brokenAt": 0}


@test("run_governed_tool_calls decides and audits every model tool call, runs only allowed ones and never logs raw arguments")
async def _():
    model = create_model()

    async def scenario():
        policy = pdp()
        audit = mod.create_audit_log(now=Clock())
        ran = []

        def tool(name, output):
            def run(arguments):
                ran.append(name)
                return output(arguments)

            return run

        tools = {
            "read_ticket": tool("read_ticket", lambda arguments: f"Ticket {arguments['id']}: refund requested"),
            "update_ticket": tool("update_ticket", lambda arguments: f"Ticket {arguments['id']} updated"),
            "send_email": tool("send_email", lambda arguments: "sent"),
            "issue_refund": tool("issue_refund", lambda arguments: "refunded"),
        }
        fake_model.reply(
            respond.one_of(
                [
                    respond.tool_calls([{"name": "read_ticket", "arguments": {"id": "T-1"}}, {"name": "send_email", "arguments": {"to": "maria@example.com", "body": "Your refund is on the way"}}]),
                    respond.tool_calls([{"name": "issue_refund", "arguments": {"amount": 120, "card": "4111111111111111"}}, {"name": "update_ticket", "arguments": {"id": "T-1", "status": "solved"}}]),
                    respond.tool_calls([{"name": "read_ticket", "arguments": {"id": "T-2"}}, {"name": "drop_database", "arguments": {}}]),
                    respond.invalid_tool_arguments("read_ticket"),
                ]
            )
        )
        response = await model.generate({"messages": [{"role": "user", "content": "Handle ticket T-1."}]})
        messages = await mod.run_governed_tool_calls(response, {"agentId": "support-agent", "purpose": "customer-support", "onBehalfOf": "customer-4411"}, policy, audit, tools)
        assert [[message["role"], message["toolCallId"]] for message in messages] == [["tool", call["id"]] for call in response["toolCalls"]]
        entries = audit.entries()
        assert len(entries) == len(response["toolCalls"])
        assert mod.verify_audit_chain(entries) == {"valid": True}
        for index, call in enumerate(response["toolCalls"]):
            decision = policy.decide({"agentId": "support-agent", "tool": call["name"], "purpose": "customer-support"})
            assert contains(
                entries[index]["event"],
                {"agentId": "support-agent", "onBehalfOf": "customer-4411", "tool": call["name"], "purpose": "customer-support", "effect": decision["effect"], "reasons": decision["reasons"], "argumentsHash": sha256(call["arguments"])},
            )
            content = messages[index]["content"]
            if decision["effect"] == "deny":
                assert content.startswith("Denied: ")
            elif decision["effect"] == "ask":
                assert content.startswith("Approval required: ")
            elif parses(call["arguments"]):
                assert re.match(r"Ticket T-\d", content)
            else:
                assert content.startswith("Error:")
        assert all(name in ("read_ticket", "update_ticket") for name in ran)
        assert not re.search(r"maria@example|4111111111111111|Your refund", json.dumps(entries))

    await for_each_seed(12, scenario)
