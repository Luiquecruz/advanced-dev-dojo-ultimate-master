import re

CATALOG = {
    "get_order": "read",
    "get_tracking": "read",
    "get_payment": "read",
    "read_policy": "read",
    "issue_refund": "write",
    "send_message": "write",
    "ban_seller": "write",
    "run_sql": "write",
}

REQUIRED_TOOLS = ["get_order", "get_tracking", "get_payment", "read_policy", "issue_refund", "send_message"]
P95_STEPS = 11
MAX_STEPS_CAP = 25
COST_PER_STEP_USD = 0.006
SECONDS_PER_STEP = 2
MAX_COST_PER_TICKET_USD = 0.15
MAX_DURATION_MS = 180000


def is_integer(value):
    return isinstance(value, int) and not isinstance(value, bool)


@test('the ADR is an accepted loop-layer decision whose context names the pilot or steps, the cost budget and human approval, with a "We will" decision')
def _():
    adr = mod.ADR
    assert is_integer(adr["id"]) and adr["id"] > 0
    assert adr["status"] == "accepted"
    assert adr["layer"] == "loop"
    assert len(adr["title"].strip()) >= 10
    assert len(adr["context"].strip()) >= 80
    assert re.search(r"step|pilot", adr["context"], re.IGNORECASE)
    assert re.search(r"cost|budget|\$", adr["context"], re.IGNORECASE)
    assert re.search(r"approv|human", adr["context"], re.IGNORECASE)
    assert len(adr["decision"].strip()) >= 40
    assert re.match(r"we will\b", adr["decision"].strip(), re.IGNORECASE)


@test("lists at least two distinct rejected alternatives with reasons, and positive and negative consequences")
def _():
    adr = mod.ADR
    assert isinstance(adr["alternatives"], list)
    assert len(adr["alternatives"]) >= 2
    for alternative in adr["alternatives"]:
        assert len(alternative["option"].strip()) >= 3
        assert len(alternative["reason"].strip()) >= 20
    options = [alternative["option"].strip().lower() for alternative in adr["alternatives"]]
    assert len(set(options)) == len(options)
    for side in ["positive", "negative"]:
        items = adr["consequences"][side]
        assert isinstance(items, list)
        assert len(items) >= 1
        for item in items:
            assert len(item.strip()) >= 15


@test("the pilot rules out a fixed workflow, and the agent gets exactly the tools a refund needs (least privilege)")
def _():
    plan = mod.AGENT_PLAN
    assert plan["pattern"] in ["agent", "hybrid"]
    assert len(plan["goal"].strip()) >= 20
    for tool in plan["tools"]:
        assert tool in CATALOG, tool
    for tool in REQUIRED_TOOLS:
        assert tool in plan["tools"], tool
    assert "ban_seller" not in plan["tools"]
    assert "run_sql" not in plan["tools"]
    assert len(set(plan["tools"])) == len(plan["tools"])


@test("refunds above $50 need approval, approvals only gate tools the agent has, and no read-only tool is gated")
def _():
    plan = mod.AGENT_PLAN
    refund_approval = next((approval for approval in plan["approvals"] if approval["tool"] == "issue_refund"), None)
    assert refund_approval is not None
    assert re.search(r"50", refund_approval["rule"])
    for approval in plan["approvals"]:
        assert approval["tool"] in plan["tools"], approval["tool"]
        assert CATALOG.get(approval["tool"]) == "write", approval["tool"]
        assert len(approval["rule"].strip()) >= 10


@test("budgets let the p95 run finish and stay within the per-ticket cost and time targets, with stuck detection and a human handoff")
def _():
    plan = mod.AGENT_PLAN
    budget = plan["budget"]
    max_steps = budget["maxSteps"]
    assert is_integer(max_steps)
    assert max_steps >= P95_STEPS
    assert max_steps <= MAX_STEPS_CAP
    assert budget["maxCostUsd"] <= MAX_COST_PER_TICKET_USD
    assert budget["maxCostUsd"] >= max_steps * COST_PER_STEP_USD - 1e-9
    assert budget["maxDurationMs"] <= MAX_DURATION_MS
    assert budget["maxDurationMs"] >= max_steps * SECONDS_PER_STEP * 1000
    assert is_integer(plan["stuckRepeatLimit"])
    assert plan["stuckRepeatLimit"] >= 2
    assert plan["stuckRepeatLimit"] <= 5
    assert plan["onBudgetExhausted"] == "handoff_to_human"


@test("runs are durable across redeploys and every write tool is idempotent; failure modes have mitigations")
def _():
    plan = mod.AGENT_PLAN
    assert plan["durability"]["checkpointEveryStep"] is True
    for tool in plan["tools"]:
        if CATALOG.get(tool) == "write":
            assert tool in plan["durability"]["idempotentTools"], tool
    assert len(plan["failureModes"]) >= 3
    for mode in plan["failureModes"]:
        assert len(mode["failure"].strip()) >= 15
        assert len(mode["mitigation"].strip()) >= 20
    failures = [mode["failure"].strip().lower() for mode in plan["failureModes"]]
    assert len(set(failures)) == len(failures)
