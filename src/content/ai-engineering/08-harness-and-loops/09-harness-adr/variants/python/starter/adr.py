ADR = {
    "id": 1,
    # TODO: a short title naming the decision
    "title": "",
    # TODO: accept the decision
    "status": "proposed",
    "layer": "harness",
    # TODO: the forces from the briefing: unattended triggers, what it needs and must never do, the incident, compliance and the budget
    "context": "",
    # TODO: one sentence starting with "We will", naming permissions, sandbox, hooks, verifiers and the loop limits
    "decision": "",
    # TODO: at least two {"option": ..., "reason": ...} you considered and rejected, each reason citing a fact from the briefing
    "alternatives": [],
    # TODO: what the team gains and what it pays or must watch
    "consequences": {"positive": [], "negative": []},
}

HARNESS_PLAN = {
    # TODO: deny what the briefing forbids, ask before new dependencies, allow only what the task needs
    "permissions": {
        "allow": ["Bash", "Edit"],
        "ask": [],
        "deny": [],
    },
    # TODO: the root, the two hosts and only the credentials the task needs
    "sandbox": {
        "root": "/",
        "networkAllowlist": ["*"],
        "credentials": ["github-token:admin"],
    },
    # TODO: hooks for the incident and the compliance rule, redaction before audit, failing closed
    "hooks": {
        "preToolUse": [],
        "postToolUse": ["audit-log"],
        "onFailure": "continue",
    },
    # TODO: the required checks, cheapest first
    "verifiers": ["llm-review"],
    # TODO: both triggers, the briefing's failure limit, a budget and iteration count that agree, and the escalation target
    "loop": {
        "triggers": ["schedule"],
        "maxIterations": 50,
        "maxFailures": 10,
        "budgetUsd": 20,
        "escalateTo": "",
    },
}
