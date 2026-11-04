ADR = {
    "id": 1,
    "title": "Triage tickets with a small EU model that escalates on validation failure",
    "status": "accepted",
    "layer": "model",
    "context": (
        "Triage classifies 60 000 tickets a day (1.8 million a month) and must be ready within a 1 500 ms p95 latency budget, "
        "including any escalation. The target is 92% accuracy on our 300-ticket eval set, the budget is $4 000 a month, "
        "tickets contain personal data that contracts require us to process in the EU, and triage must survive a provider "
        "outage at no less than 88% accuracy."
    ),
    "decision": (
        "We will send every ticket to atlas-mini-2026-07-15, escalate answers the validator rejects to nimbus-mid-2026-08-01, "
        "and fall back to nimbus-mid-2026-08-01 when Atlas is down."
    ),
    "alternatives": [
        {
            "option": "nimbus-mid-2026-08-01 for every ticket",
            "reason": "It meets latency and accuracy alone, but 1.8 million tickets at $2.50 per thousand cost $4 500 a month, above the $4 000 budget.",
        },
        {
            "option": "atlas-pro-2026-05-20 as the escalation model",
            "reason": "Its 2 600 ms p95 breaks the 1 500 ms latency budget on its own, before adding the primary call.",
        },
        {
            "option": "vega-flash-2026-04-10 as primary or fallback",
            "reason": "It is cheap, fast and accurate, but it processes data in the US only, which our contracts forbid for personal data.",
        },
        {
            "option": "Self-hosted tern-14b-q4 as primary",
            "reason": "At 91% it misses the accuracy target, and escalating to a 92% model would add up to 1 900 ms p95, above the budget.",
        },
    ],
    "consequences": {
        "positive": [
            "Projected spend is about $1 575 a month, well under the $4 000 budget, with room for volume growth.",
            "Every call stays in the EU and within the 1 500 ms p95 budget, including escalations.",
            "An Atlas outage moves traffic to Nimbus, a different provider, at 94% accuracy.",
        ],
        "negative": [
            "The validator becomes a critical component: if it accepts wrong categories, accuracy drops silently.",
            "During an Atlas outage every ticket costs $2.50 per thousand instead of about $0.88, so long outages raise the bill.",
            "Two providers mean two contracts, two snapshot deprecation schedules and evals for both prompts.",
        ],
    },
}

MODEL_PLAN = {
    "primary": "atlas-mini-2026-07-15",
    "escalation": "nimbus-mid-2026-08-01",
    "escalationRule": "Escalate when the validator rejects the answer: the category is not one of the 12 or the confidence is below 0.7.",
    "fallback": "nimbus-mid-2026-08-01",
    "projectedMonthlyUsd": 1575,
}
