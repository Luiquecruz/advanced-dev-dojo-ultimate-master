ADR = {
    "id": 1,
    # TODO: a short title naming the decision
    "title": "",
    # TODO: accept the decision
    "status": "proposed",
    "layer": "loop",
    # TODO: the forces from the briefing: requirements per feature, pilot results and incidents
    "context": "",
    # TODO: one sentence starting with "We will", naming the architecture per feature and the orchestrator safeguards
    "decision": "",
    # TODO: at least two {"option": ..., "reason": ...} you considered and rejected, each reason citing a pilot number
    "alternatives": [],
    # TODO: what the team gains and what it pays or must watch
    "consequences": {"positive": [], "negative": []},
}

MULTI_AGENT_PLAN = {
    # TODO: the architecture whose pilot row meets every requirement of each feature
    "architectures": {
        "market-scan": "handoff-swarm",
        "report-editing": "orchestrator-workers",
    },
    # TODO: maxPlanAttempts x $0.20 + $0.40 + maxWorkers x $0.50 must fit budgetUsd (at most $5); concurrency within the provider limit
    "orchestrator": {
        "maxWorkers": 12,
        "concurrency": 12,
        "maxPlanAttempts": 1,
        "budgetUsd": 10,
    },
    # TODO: 1 means workers cannot delegate
    "limits": {
        "maxDelegationDepth": 3,
    },
    # TODO: checks from "schema", "citations", "llm-judge"
    "validation": [],
    # TODO: "continue" or "abort", and the share of workers that must succeed
    "failurePolicy": {
        "onWorkerFailure": "abort",
        "minSuccessfulShare": 1,
    },
    # TODO: "in-process", "mcp" or "a2a" for each integration
    "integrations": {
        "vendor-database": "a2a",
        "certifyhub-compliance": "mcp",
        "research-workers": "a2a",
    },
}
