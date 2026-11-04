ADR = {
    "id": 7,
    "title": "Resolve refund tickets with a bounded, approval-gated, durable agent",
    "status": "accepted",
    "layer": "loop",
    "context": (
        "Resolve handles about 4 000 refund tickets a day. In the pilot a fixed workflow resolved 41% of tickets because each needs 2 to 14 lookups, "
        "while an agent resolved 83%; successful runs took a p95 of 11 steps at about $0.006 and 2 seconds per step. "
        "Each ticket may cost at most $0.15 and 3 minutes of agent time. Refunds are irreversible and those above $50 need a human approval "
        "that can take 24 hours, while workers are redeployed several times a day."
    ),
    "decision": (
        "We will run Resolve as a single agent with read tools plus issue_refund and send_message, gate refunds above $50 behind a lead approval, "
        "cap each run at 16 steps, $0.12 and 2 minutes, checkpoint every step with idempotency keys, and hand unfinished tickets to the human queue."
    ),
    "alternatives": [
        {
            "option": "Fixed workflow: look up, check policy, refund or decline",
            "reason": "It resolved only 41% of pilot tickets because the number of lookups depends on what each lookup reveals.",
        },
        {
            "option": "Approve every refund by a human",
            "reason": "The finance policy allows refunds up to $50 without review; gating all of them would create approval fatigue and slow customers down.",
        },
        {
            "option": "Give the agent run_sql for flexible lookups",
            "reason": "It can read and write any table, far beyond what refunds need; the four read tools cover the pilot cases with least privilege.",
        },
        {
            "option": "Unlimited steps until the model says it is done",
            "reason": "Prototype traces show runs that repeat the same lookup; without budgets those runs exceed the $0.15 per ticket target.",
        },
    ],
    "consequences": {
        "positive": [
            "About twice as many tickets resolved without a human as with the fixed workflow.",
            "Worst-case cost per ticket is capped at $0.12, below the $0.15 target.",
            "Approved refunds survive redeploys and are never paid twice thanks to checkpoints and idempotency keys.",
        ],
        "negative": [
            "Support leads must review refunds above $50 every day, and slow reviews delay customers.",
            "A checkpoint store and the review queue become production components to operate.",
            "Agent trajectories vary between runs, so we need trajectory evals and traces instead of only unit tests.",
        ],
    },
}

AGENT_PLAN = {
    "pattern": "agent",
    "goal": "Resolve a refund ticket by investigating the order, applying the refund policy and informing the customer.",
    "tools": ["get_order", "get_tracking", "get_payment", "read_policy", "issue_refund", "send_message"],
    "approvals": [{"tool": "issue_refund", "rule": "A support lead approves every refund above $50; smaller refunds run directly."}],
    "budget": {"maxSteps": 16, "maxCostUsd": 0.12, "maxDurationMs": 120000},
    "stuckRepeatLimit": 3,
    "onBudgetExhausted": "handoff_to_human",
    "durability": {"checkpointEveryStep": True, "idempotentTools": ["issue_refund", "send_message"]},
    "failureModes": [
        {
            "failure": "The agent repeats the same tracking lookup",
            "mitigation": "Stop the run after 3 identical consecutive calls and hand the ticket to a human.",
        },
        {
            "failure": "A worker restarts after a refund was paid but before it was recorded",
            "mitigation": "Resume from the checkpoint and resend the refund with the same idempotency key, which the payment API ignores.",
        },
        {
            "failure": "A seller message contains instructions aimed at the agent",
            "mitigation": "Treat tool results as data, keep refunds above $50 behind approval and give the agent no destructive tools.",
        },
        {
            "failure": "The agent tells the customer a refund was issued before it happened",
            "mitigation": "Send refund confirmations only after issue_refund returns, and check messages against tool results in trajectory evals.",
        },
    ],
}
