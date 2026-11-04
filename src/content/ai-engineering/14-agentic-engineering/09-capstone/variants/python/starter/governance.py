TRIFECTA_LEGS = ("privateData", "untrustedContent", "exfiltration")
CONTROLS = ("policy", "human-approval", "verifier", "budget", "eval-gate", "sandbox", "monitoring")

# TODO: list the tools behind each trifecta leg, the leg your policy removes, and at least four threats with a reference, a mitigation and a control
THREAT_MODEL = {
    "system": "Ledgerly Support Copilot",
    "assets": [],
    "trifecta": {
        "privateData": [],
        "untrustedContent": [],
        "exfiltration": [],
    },
    "removedLeg": "exfiltration",
    "threats": [
        {"id": "T1", "title": "Indirect prompt injection through customer-written invoice notes", "reference": "OWASP LLM01 / ASI01", "mitigation": "", "control": "policy"},
    ],
}

# TODO: owners, every server tool with an owner, a classification and the approval the policy enforces, the pinned model, the budgets, the eval gate, the review cadence and the regulations
GOVERNANCE_MAP = {
    "owners": {"product": "", "security": "", "data": "", "operations": ""},
    "tools": [],
    "model": {"id": "dojo-fake-1-latest", "pinned": False, "promotion": ""},
    "budgets": {"maxSteps": 0, "maxCostUsd": 0},
    "evalGate": {"threshold": 0, "criticalCases": []},
    "reviewCadence": "yearly",
    "regulations": [],
}
