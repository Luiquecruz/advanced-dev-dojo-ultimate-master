import re

ARCHITECTURES = ["single-agent", "orchestrator-workers", "handoff-swarm"]
PILOT = {
    "market-scan": {
        "single-agent": {"passRate": 0.64, "costUsd": 0.9, "p95Seconds": 660},
        "orchestrator-workers": {"passRate": 0.86, "costUsd": 3.7, "p95Seconds": 240},
        "handoff-swarm": {"passRate": 0.71, "costUsd": 5.4, "p95Seconds": 780},
    },
    "report-editing": {
        "single-agent": {"passRate": 0.92, "costUsd": 0.25, "p95Seconds": 40},
        "orchestrator-workers": {"passRate": 0.81, "costUsd": 1.1, "p95Seconds": 70},
        "handoff-swarm": {"passRate": 0.78, "costUsd": 1.6, "p95Seconds": 95},
    },
}
REQUIREMENTS = {
    "market-scan": {"passRate": 0.8, "costUsd": 5, "p95Seconds": 360},
    "report-editing": {"passRate": 0.8, "costUsd": 0.5, "p95Seconds": 60},
}
PLANNER_ATTEMPT_USD = 0.2
SYNTHESIS_USD = 0.4
WORKER_USD = 0.5
PROVIDER_CONCURRENCY = 4


def is_integer(value):
    return isinstance(value, int) and not isinstance(value, bool)


def is_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


@test('the ADR is an accepted loop-layer decision whose context names cost and quality or latency, with a "We will" decision')
def _():
    adr = mod.ADR
    assert is_integer(adr["id"]) and adr["id"] > 0
    assert adr["status"] == "accepted"
    assert adr["layer"] == "loop"
    assert len(adr["title"].strip()) >= 10
    assert len(adr["context"].strip()) >= 80
    assert re.search(r"cost|budget|\$", adr["context"], re.IGNORECASE)
    assert re.search(r"pass rate|quality|latency|p95", adr["context"], re.IGNORECASE)
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


@test("each feature uses the architecture that meets every requirement in the pilot")
def _():
    architectures = mod.MULTI_AGENT_PLAN["architectures"]
    assert sorted(architectures) == ["market-scan", "report-editing"]
    for feature, architecture in architectures.items():
        assert architecture in ARCHITECTURES
        measured = PILOT[feature][architecture]
        required = REQUIREMENTS[feature]
        assert measured["passRate"] >= required["passRate"], f"{architecture} passes {measured['passRate']} of {feature} tasks, below {required['passRate']}"
        assert measured["costUsd"] <= required["costUsd"], f"{architecture} costs ${measured['costUsd']} per {feature} task, above ${required['costUsd']}"
        assert measured["p95Seconds"] <= required["p95Seconds"], f"{architecture} has a p95 of {measured['p95Seconds']} s for {feature}, above {required['p95Seconds']} s"


@test("the orchestrator limits fit the budget, the provider concurrency and a malformed first plan")
def _():
    orchestrator = mod.MULTI_AGENT_PLAN["orchestrator"]
    max_workers = orchestrator["maxWorkers"]
    concurrency = orchestrator["concurrency"]
    max_plan_attempts = orchestrator["maxPlanAttempts"]
    budget_usd = orchestrator["budgetUsd"]
    for value in [max_workers, concurrency, max_plan_attempts]:
        assert is_integer(value), value
    assert max_workers >= 2
    assert max_plan_attempts >= 2
    assert is_number(budget_usd)
    assert budget_usd > 0
    assert budget_usd <= REQUIREMENTS["market-scan"]["costUsd"]
    worst_case = max_plan_attempts * PLANNER_ATTEMPT_USD + SYNTHESIS_USD + max_workers * WORKER_USD
    assert worst_case <= budget_usd + 1e-9, f"the worst-case scan costs ${worst_case:.2f}, above the ${budget_usd} budget"
    assert concurrency >= 2
    assert concurrency <= PROVIDER_CONCURRENCY
    assert concurrency <= max_workers


@test("workers cannot delegate, and their outputs are checked for shape and citations before synthesis")
def _():
    plan = mod.MULTI_AGENT_PLAN
    assert plan["limits"]["maxDelegationDepth"] == 1
    checks = plan["validation"]
    assert isinstance(checks, list)
    for check in checks:
        assert check in ["schema", "citations", "llm-judge"], check
    assert len(set(checks)) == len(checks)
    assert "schema" in checks
    assert "citations" in checks


@test("a failed worker does not sink a scan, but a report needs at least half of the workers")
def _():
    failure_policy = mod.MULTI_AGENT_PLAN["failurePolicy"]
    assert failure_policy["onWorkerFailure"] == "continue"
    assert failure_policy["minSuccessfulShare"] >= 0.5
    assert failure_policy["minSuccessfulShare"] < 1


@test("each integration uses the protocol that fits it")
def _():
    assert mod.MULTI_AGENT_PLAN["integrations"] == {
        "vendor-database": "mcp",
        "certifyhub-compliance": "a2a",
        "research-workers": "in-process",
    }
