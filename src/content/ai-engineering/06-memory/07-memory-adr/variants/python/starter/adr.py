ADR = {
    "id": 1,
    # TODO: a short title naming the decision
    "title": "",
    # TODO: accept the decision
    "status": "proposed",
    "layer": "context",
    # TODO: the forces from the briefing: users and households, conversation length, token budget, time-dependent questions, untrusted input, GDPR duties
    "context": "",
    # TODO: one sentence starting with "We will", naming the conversation strategy, the long-term store, isolation and retention
    "decision": "",
    # TODO: at least two {"option": ..., "reason": ...} you considered and rejected, each reason citing a fact from the briefing
    "alternatives": [],
    # TODO: what the team gains and what it pays or must watch
    "consequences": {"positive": [], "negative": []},
}

MEMORY_PLAN = {
    # TODO: the memory types Concierge keeps, and how procedures may change
    "types": ["working"],
    "procedureUpdates": "automatic",
    # TODO: a strategy that survives 300 turns, the recent messages always kept, and the conversation's token share
    "conversation": {"strategy": "full-history", "maxTokens": 6000, "keepRecentMessages": 0},
    # TODO: the store from the pilot table that meets both targets, how many memories to retrieve, and positive weights
    "longTerm": {"store": "vector", "topK": 20, "weights": {"relevance": 1, "recency": 0, "importance": 0}},
    # TODO: isolation, untrusted instructions, retention and erasure from the briefing
    "isolation": "per-contract",
    "untrustedInstructions": "allow",
    "retentionDays": 0,
    "erasure": {"maxDays": 90, "includesDerived": False},
}
