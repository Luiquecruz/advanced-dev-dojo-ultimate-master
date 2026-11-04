GOLDEN_SET = [
    {
        "query": "How long until a refund reaches my card?",
        "relevance": {"billing-refund-timing": 3, "billing-refund-window": 1},
    },
    {
        "query": "Can I get my money back on an annual plan after two months?",
        "relevance": {"billing-refund-window": 3, "billing-refund-timing": 1},
    },
    {"query": "E-4012", "relevance": {"inbox-forwarding": 3}},
    {
        "query": "Which plan includes SAML single sign-on?",
        "relevance": {"security-sso": 3, "security-audit-log": 1},
    },
    {"query": "require 2FA for all agents", "relevance": {"security-two-factor": 3}},
    {
        "query": "How long are closed tickets kept?",
        "relevance": {"security-retention": 3, "automations-rules": 1},
    },
    {"query": "alert before resolution target is breached", "relevance": {"automations-sla": 3}},
    {
        "query": "Is the price difference prorated when I upgrade?",
        "relevance": {"billing-plan-change": 3, "billing-seats": 1},
    },
    {"query": "chat widget on our website", "relevance": {"inbox-chat": 3}},
    {"query": "who changed permissions last month", "relevance": {"security-audit-log": 3}},
]
