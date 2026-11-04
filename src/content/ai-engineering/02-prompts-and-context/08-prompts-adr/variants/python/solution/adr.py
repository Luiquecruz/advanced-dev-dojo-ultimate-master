ADR = {
    "id": 2,
    "title": "Extract damage claims with schema-constrained output, similar examples and a cached prefix",
    "status": "accepted",
    "layer": "context",
    "context": (
        "Claim Intake turns 40 000 damage-claim emails a day into records the refund service consumes directly, so every record "
        "must match its schema; at least 99.5% must be valid within a 3 000 ms p95 latency budget while the customer waits. "
        "Damage types must reach 90% accuracy, carrier reports can reach 20 000 tokens although accuracy falls above 4 000, and "
        "a one-off backfill of 1.2 million claims has a $6 000 budget and a two-week deadline."
    ),
    "decision": (
        "We will request schema-constrained JSON validated locally against the same JSON Schema and re-asked once, select 3 to 6 "
        "similar examples within 800 tokens, keep instructions and schema as a cached prefix, cap attachments at 4 000 tokens, "
        "run the backfill through the batch API and release versioned prompts through staging before production."
    ),
    "alternatives": [
        {"option": "Free-text output parsed with regular expressions", "reason": "The refund service rejects any record off its schema, and free text gives no field guarantees or located validation errors."},
        {"option": "Three attempts per claim", "reason": "Three calls can take 3 300 ms at p95, above the 3 000 ms budget, for only 0.2 points more valid records."},
        {"option": "Three fixed examples for every claim", "reason": "The pilot measured 81% damage-type accuracy with fixed examples, below the 90% target."},
        {"option": "Send the whole carrier report", "reason": "Reports reach 20 000 tokens and accuracy fell sharply above 4 000 tokens of report, so more context made answers worse and costlier."},
        {"option": "Interactive API for the backfill", "reason": "At full price the backfill costs about $10 080, above the $6 000 budget, and nobody waits for individual results."},
    ],
    "consequences": {
        "positive": [
            "The refund service only receives records that passed the same JSON Schema it expects.",
            "The stable 2 400-token prefix is cached across claims, lowering cost and time to first token.",
            "The backfill costs about $5 040, within budget, without touching live rate limits.",
        ],
        "negative": [
            "About 0.4% of live claims still reach the human queue and need staffing.",
            "The example pool becomes production data: mislabeled claims are copied by the model, so it needs review.",
            "Every prompt change waits for staging tests, which slows urgent wording fixes.",
        ],
    },
}

PROMPT_PLAN = {
    "promptVersion": "claim-intake@1.0.0",
    "environments": ["staging", "production"],
    "output": {"mode": "json-schema", "validateLocally": True, "maxAttempts": 2},
    "examples": {"strategy": "similarity", "count": 4, "maxTokens": 800},
    "layout": ["instructions", "output-schema", "examples", "attachment", "claim"],
    "cacheBreakpointAfter": "output-schema",
    "context": {"inputBudgetTokens": 30000, "outputReserveTokens": 1000, "maxAttachmentTokens": 4000},
    "processing": {"live": "interactive", "backfill": "batch"},
    "backfillCostUsd": 5040,
}
