import re

MEMORY_TYPES = ["working", "episodic", "semantic", "procedural"]
STRATEGIES = ["full-history", "sliding-window", "running-summary", "window-plus-summary"]
STORES = {
    "none": {"preference": 0.31, "atTheTime": 0.12, "p95Ms": 0},
    "files": {"preference": 0.82, "atTheTime": 0.49, "p95Ms": 40},
    "vector": {"preference": 0.9, "atTheTime": 0.58, "p95Ms": 60},
    "temporal-graph": {"preference": 0.89, "atTheTime": 0.91, "p95Ms": 180},
}
MEMORY_BUDGET_TOKENS = 6000
TOKENS_PER_MEMORY = 80


def is_integer(value):
    return isinstance(value, int) and not isinstance(value, bool)


def is_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


@test('the ADR is an accepted context-layer decision whose context names the token budget, changing facts and privacy duties, with a "We will" decision')
def _():
    adr = mod.ADR
    assert is_integer(adr["id"]) and adr["id"] > 0
    assert adr["status"] == "accepted"
    assert adr["layer"] == "context"
    assert len(adr["title"].strip()) >= 10
    assert len(adr["context"].strip()) >= 80
    assert re.search(r"token|budget", adr["context"], re.IGNORECASE)
    assert re.search(r"time|temporal|chang", adr["context"], re.IGNORECASE)
    assert re.search(r"privacy|GDPR|erasure|personal data", adr["context"], re.IGNORECASE)
    assert len(adr["decision"].strip()) >= 40
    assert re.match(r"we will\b", adr["decision"].strip(), re.IGNORECASE)


@test("lists at least two distinct rejected alternatives with reasons, and positive and negative consequences")
def _():
    adr = mod.ADR
    assert isinstance(adr["alternatives"], list)
    assert len(adr["alternatives"]) >= 2
    for alternative in adr["alternatives"]:
        assert len(alternative["option"].strip()) >= 3
        assert len(alternative["reason"].strip()) >= 20
    options = [alternative["option"].strip().lower() for alternative in adr["alternatives"]]
    assert len(set(options)) == len(options)
    for side in ["positive", "negative"]:
        items = adr["consequences"][side]
        assert isinstance(items, list)
        assert len(items) >= 1
        for item in items:
            assert len(item.strip()) >= 15


@test("keeps working, episodic and semantic memory, and procedures never change without review")
def _():
    plan = mod.MEMORY_PLAN
    assert isinstance(plan["types"], list)
    for memory_type in plan["types"]:
        assert memory_type in MEMORY_TYPES, memory_type
    for memory_type in ["working", "episodic", "semantic"]:
        assert memory_type in plan["types"], memory_type
    assert plan["procedureUpdates"] in ["none", "reviewed"]


@test("the conversation strategy survives 300-turn sessions and shares the 6 000-token budget with enough retrieved memories")
def _():
    conversation = mod.MEMORY_PLAN["conversation"]
    long_term = mod.MEMORY_PLAN["longTerm"]
    assert conversation["strategy"] in STRATEGIES
    assert conversation["strategy"] != "full-history"
    assert conversation["keepRecentMessages"] >= 2
    assert conversation["maxTokens"] >= 1500
    assert is_integer(long_term["topK"])
    assert long_term["topK"] >= 3
    assert conversation["maxTokens"] + long_term["topK"] * TOKENS_PER_MEMORY <= MEMORY_BUDGET_TOKENS


@test("the long-term store meets both eval targets within the latency budget, and every retrieval weight counts")
def _():
    long_term = mod.MEMORY_PLAN["longTerm"]
    assert long_term["store"] in STORES, f'"{long_term["store"]}" is not a store from the pilot table'
    store = STORES[long_term["store"]]
    assert store["preference"] >= 0.85
    assert store["atTheTime"] >= 0.85
    assert store["p95Ms"] <= 250
    for name in ["relevance", "recency", "importance"]:
        weight = long_term["weights"][name]
        assert is_number(weight), name
        assert weight > 0, name


@test("memories are isolated per person, untrusted instructions are rejected, and retention and erasure meet the GDPR commitments")
def _():
    plan = mod.MEMORY_PLAN
    assert plan["isolation"] == "per-user"
    assert plan["untrustedInstructions"] == "reject"
    assert plan["retentionDays"] >= 1
    assert plan["retentionDays"] <= 365
    assert plan["erasure"]["maxDays"] > 0
    assert plan["erasure"]["maxDays"] <= 30
    assert plan["erasure"]["includesDerived"] is True
