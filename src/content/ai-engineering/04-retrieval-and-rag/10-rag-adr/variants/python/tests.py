import re

MEASURED = [
    {"chunking": "fixed", "retrieval": "vector", "reranker": "none", "recall": 0.71, "p95Ms": 90, "costPerThousand": 0.1},
    {"chunking": "recursive", "retrieval": "vector", "reranker": "none", "recall": 0.78, "p95Ms": 120, "costPerThousand": 0.1},
    {"chunking": "recursive", "retrieval": "bm25", "reranker": "none", "recall": 0.74, "p95Ms": 60, "costPerThousand": 0.02},
    {"chunking": "recursive", "retrieval": "hybrid", "reranker": "none", "recall": 0.87, "p95Ms": 140, "costPerThousand": 0.12},
    {"chunking": "structure-aware", "retrieval": "hybrid", "reranker": "none", "recall": 0.89, "p95Ms": 140, "costPerThousand": 0.12},
    {"chunking": "structure-aware", "retrieval": "vector", "reranker": "cross-encoder", "recall": 0.86, "p95Ms": 290, "costPerThousand": 0.58},
    {"chunking": "recursive", "retrieval": "hybrid", "reranker": "cross-encoder", "recall": 0.93, "p95Ms": 310, "costPerThousand": 0.6},
    {"chunking": "structure-aware", "retrieval": "hybrid", "reranker": "cross-encoder", "recall": 0.95, "p95Ms": 320, "costPerThousand": 0.6},
    {"chunking": "structure-aware", "retrieval": "hybrid", "reranker": "llm", "recall": 0.96, "p95Ms": 1900, "costPerThousand": 6},
]

RECALL_TARGET = 0.9
LATENCY_BUDGET_MS = 400
COST_BUDGET_PER_THOUSAND = 1
PROMPT_PASSAGES = 5
FRESHNESS_MINUTES = 5
GOLDEN_SET_SIZE = 400


def chosen_row():
    plan = mod.RETRIEVAL_PLAN
    strategy = plan["chunking"]["strategy"]
    for row in MEASURED:
        if row["chunking"] == strategy and row["retrieval"] == plan["retrieval"] and row["reranker"] == plan["reranker"]:
            return row
    raise AssertionError(f"{strategy} + {plan['retrieval']} + {plan['reranker']} was not measured in the briefing table")


@test('the ADR is an accepted context-layer decision whose context names latency, recall and tenants or permissions, with a "We will" decision')
def _():
    adr = mod.ADR
    assert isinstance(adr["id"], int) and adr["id"] > 0
    assert adr["status"] == "accepted"
    assert adr["layer"] == "context"
    assert len(adr["title"].strip()) >= 10
    assert len(adr["context"].strip()) >= 80
    assert re.search(r"latency|p95|\bms\b", adr["context"], re.IGNORECASE)
    assert re.search(r"recall|golden", adr["context"], re.IGNORECASE)
    assert re.search(r"tenant|permission|access", adr["context"], re.IGNORECASE)
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


@test("the chosen chunking, retrieval and reranker are a measured variant that meets the recall, latency and cost limits")
def _():
    plan = mod.RETRIEVAL_PLAN
    assert plan["chunking"]["strategy"] in ["fixed", "recursive", "structure-aware"]
    assert plan["retrieval"] in ["vector", "bm25", "hybrid"]
    assert plan["reranker"] in ["none", "cross-encoder", "llm"]
    row = chosen_row()
    assert row["recall"] >= RECALL_TARGET
    assert row["p95Ms"] <= LATENCY_BUDGET_MS
    assert row["costPerThousand"] <= COST_BUDGET_PER_THOUSAND


@test("chunk sizes are sane, hybrid retrieval fuses with RRF, and enough candidates reach the reranker for the 5-passage prompt")
def _():
    plan = mod.RETRIEVAL_PLAN
    size = plan["chunking"]["size"]
    overlap = plan["chunking"]["overlap"]
    assert size > 0
    assert 0 <= overlap <= size / 4
    assert plan["fusion"] == ("rrf" if plan["retrieval"] == "hybrid" else None)
    assert plan["topK"] == PROMPT_PASSAGES
    assert plan["candidates"] >= 20
    assert plan["candidates"] >= plan["topK"]


@test("permissions are enforced before ranking with tenant isolation, and the index honors the 5-minute freshness promise")
def _():
    plan = mod.RETRIEVAL_PLAN
    assert plan["permissionFilter"] == "before-ranking"
    assert plan["tenantIsolation"] in ["tenant-filter", "index-per-tenant"]
    assert plan["freshness"]["mode"] == "event-driven"
    assert 0 < plan["freshness"]["maxLagMinutes"] <= FRESHNESS_MINUTES


@test("answers must cite, missing evidence goes to a human, and the eval gate is recall@5 at 0.90 on the golden set")
def _():
    plan = mod.RETRIEVAL_PLAN
    assert plan["citations"] == "required"
    assert plan["noEvidence"] == "handoff"
    assert plan["evaluation"]["metric"] == "recall@5"
    assert RECALL_TARGET <= plan["evaluation"]["target"] <= 1
    assert plan["evaluation"]["goldenSetSize"] >= GOLDEN_SET_SIZE
