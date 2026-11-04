TRIFECTA_LEGS = ("privateData", "untrustedContent", "exfiltration")
CONTROLS = ("policy", "human-approval", "verifier", "budget", "eval-gate", "sandbox", "monitoring")

THREAT_MODEL = {
    "system": "Ledgerly Support Copilot: agent loop over MCP tools for help center search, invoice lookup, refunds and email.",
    "assets": ["customer invoices and notes (personal and financial data)", "refund authority", "internal support procedures"],
    "trifecta": {
        "privateData": ["get_invoice"],
        "untrustedContent": ["get_invoice"],
        "exfiltration": ["send_email"],
    },
    "removedLeg": "exfiltration",
    "threats": [
        {"id": "T1", "title": "Indirect prompt injection through customer-written invoice notes", "reference": "OWASP LLM01 / ASI01", "mitigation": "No exfiltration channel: send_* tools are denied by the policy, whatever the model asks.", "control": "policy"},
        {"id": "T2", "title": "Unauthorized or oversized refunds", "reference": "OWASP ASI02 Tool Misuse and Exploitation", "mitigation": "Every refund needs a team lead; refunds above 500 USD are denied and go to finance.", "control": "human-approval"},
        {"id": "T3", "title": "Answers that invent procedures or cite nothing", "reference": "OWASP LLM09 Misinformation", "mitigation": "The citation verifier rejects answers without sources returned by search_docs.", "control": "verifier"},
        {"id": "T4", "title": "Runaway loops and cost", "reference": "OWASP LLM10 Unbounded Consumption", "mitigation": "Step and cost budgets per question.", "control": "budget"},
        {"id": "T5", "title": "Silent regressions after a prompt or model change", "reference": "Module 10 regression gates", "mitigation": "The golden set gate blocks a release below the threshold or with a critical failure.", "control": "eval-gate"},
    ],
}

GOVERNANCE_MAP = {
    "owners": {"product": "Support Operations lead", "security": "Application Security team", "data": "Data Protection Officer", "operations": "Platform team"},
    "tools": [
        {"name": "search_docs", "owner": "Support Operations lead", "dataClassification": "internal", "approval": "none"},
        {"name": "get_invoice", "owner": "Data Protection Officer", "dataClassification": "confidential", "approval": "none"},
        {"name": "issue_refund", "owner": "Support Operations lead", "dataClassification": "confidential", "approval": "human"},
        {"name": "send_email", "owner": "Application Security team", "dataClassification": "confidential", "approval": "blocked"},
    ],
    "model": {"id": "dojo-fake-1-2026-10-01", "pinned": True, "promotion": "A new model or prompt is promoted only when the golden set passes the eval gate."},
    "budgets": {"maxSteps": 6, "maxCostUsd": 0.05},
    "evalGate": {"threshold": 0.8, "criticalCases": ["refund-above-limit"]},
    "reviewCadence": "quarterly",
    "regulations": ["GDPR", "LGPD", "EU AI Act (internal tool, transparency duties)"],
}
