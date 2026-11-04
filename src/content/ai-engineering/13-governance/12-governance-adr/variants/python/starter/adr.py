ADR = {
    "id": 1,
    # TODO: a short title naming the decision
    "title": "",
    # TODO: accept the decision
    "status": "proposed",
    "layer": "governance",
    # TODO: the forces from the briefing: sprawl findings (owners, shared keys, shadow AI), credit oversight, model retirement and the regulation (LGPD, GDPR, AI Act)
    "context": "",
    # TODO: one sentence starting with "We will"
    "decision": "",
    # TODO: at least two {"option": ..., "reason": ...} you considered and rejected
    "alternatives": [],
    # TODO: what the team gains and what it pays or must watch
    "consequences": {"positive": [], "negative": []},
}

GOVERNANCE_PLAN = {
    # TODO: one entry per layer (organizational, regulatory, data, model, agent-identity, application, operational-cost, engineering, audit) with an owner from the briefing, controls, enforcement ("runtime", "ci" or "process") and evidence
    "layers": [
        {"layer": "organizational", "owner": "everyone", "controls": ["AI policy document"], "enforcement": "process", "evidence": ""},
    ],
    # TODO: fix the audit findings within the credential and audit policies; shadow AI gets "sanctioned-alternative", "ban-only" or "ignore"
    "inventory": {
        "requireOwner": False,
        "credentialMaxTtlDays": 365,
        "auditEveryDays": 365,
        "shadowAiResponse": "ban-only",
    },
    # TODO: decisionPoint "every-tool-call", "session-start" or "none"; defaultEffect "allow" or "deny"; auditLog "hash-chained" or "plain"
    "identity": {
        "perAgentIdentity": False,
        "sharedKeysAllowed": True,
        "decisionPoint": "session-start",
        "defaultEffect": "allow",
        "auditLog": "plain",
        "auditRetentionYears": 1,
        "killSwitch": False,
    },
    # TODO: {"name", "feature", "legalBasis"} per customer-facing feature; minimization "allowlist", "blocklist" or "none"; providerTraining "opted-out" or "allowed"
    "data": {
        "purposes": [],
        "minimization": "none",
        "retentionDays": 365,
        "providerTraining": "allowed",
    },
    # TODO: pinned versions, every required eval suite, maxRegression at most 0.05, a migrationStartBy date in time for the retirement
    "models": {
        "pinnedVersions": False,
        "requiredEvals": [],
        "maxRegression": 0.1,
        "migrationStartBy": "2027-01-15",
    },
    # TODO: {"id", "team"?, "feature"?, "limitUsd"} budgets for all four features within the monthly limit, an alert before the limit, hard limits and per-agent rate limits
    "cost": {
        "monthlyLimitUsd": 20000,
        "budgets": [],
        "alertThresholds": [1],
        "hardLimit": False,
        "rateLimitPerAgent": False,
    },
    # TODO: creditDecisions "human-review-all", "human-review-adverse" or "none", at a sustainable volume, with override tracking and an appeal path
    "oversight": {
        "creditDecisions": "none",
        "reviewQueueMaxPerAnalystPerDay": 600,
        "overrideRateTracked": False,
        "appealPath": False,
    },
    # TODO: the markets, a quarterly review and {"feature", "jurisdiction", "instrument", "status"} obligations with status "applies", "upcoming" or "proposed"
    "regulatory": {
        "markets": ["BR"],
        "reviewEveryDays": 365,
        "obligations": [],
    },
}
