import math

GOLDEN = [
    {"query": "refund timing", "relevance": {"timing": 3, "window": 1}},
    {"query": "error E-4012", "relevance": {"forwarding": 3}},
    {"query": "single sign-on", "relevance": {"sso": 3, "audit": 1, "ignored": 0}},
]

RANKINGS = {
    "refund timing": ["window", "seats", "timing"],
    "error E-4012": ["chat", "sso", "seats"],
    "single sign-on": ["sso", "audit", "chat"],
}


class SpyRetriever:
    def __init__(self, behavior):
        self.behavior = behavior
        self.calls = []

    def __call__(self, query, limit):
        self.calls.append((query, limit))
        return self.behavior(query, limit)


@test("recall_at_k is the share of relevant ids found in the top k, counting repeated ids once")
async def _():
    assert mod.recall_at_k(["a", "b", "c", "d"], ["b", "d", "z"], 2) == approx(1 / 3, abs=1e-9)
    assert mod.recall_at_k(["a", "b", "c", "d"], ["b", "d", "z"], 4) == approx(2 / 3, abs=1e-9)
    assert mod.recall_at_k(["a", "a", "a", "b"], ["b"], 2) == 1
    assert mod.recall_at_k(["a"], ["a", "b"], 10) == 0.5
    assert mod.recall_at_k([], ["a"], 5) == 0
    error = await capture_error(lambda: mod.recall_at_k(["a"], [], 5))
    assert isinstance(error, Exception)


@test("reciprocal_rank is 1 / the position of the first relevant id, or 0 when none is retrieved")
def _():
    assert mod.reciprocal_rank(["x", "y", "a", "b"], ["a", "b"]) == approx(1 / 3, abs=1e-9)
    assert mod.reciprocal_rank(["a", "y"], ["a"]) == 1
    assert mod.reciprocal_rank(["x", "x", "a"], ["a"]) == 0.5
    assert mod.reciprocal_rank(["x", "y"], ["a"]) == 0


@test("ndcg_at_k uses graded gains 2^grade - 1 discounted by log2(position + 1) and divides by the ideal ordering")
def _():
    relevance = {"a": 3, "b": 1, "c": 2}
    dcg = 1 / math.log2(2) + 7 / math.log2(3)
    ideal = 7 / math.log2(2) + 3 / math.log2(3) + 1 / math.log2(4)
    assert mod.ndcg_at_k(["b", "a", "x", "c"], relevance, 3) == approx(dcg / ideal, abs=1e-9)
    assert mod.ndcg_at_k(["a", "c", "b"], relevance, 3) == approx(1, abs=1e-9)
    assert mod.ndcg_at_k(["a", "c"], {"a": 3, "c": 2, "b": 1}, 2) == approx(1, abs=1e-9)
    assert mod.ndcg_at_k(["a", "b", "c"], relevance, 3) < 1
    assert mod.ndcg_at_k(["a", "b", "c"], relevance, 3) > mod.ndcg_at_k(["b", "c", "a"], relevance, 3)
    assert mod.ndcg_at_k(["x", "y", "a"], relevance, 2) == 0
    assert mod.ndcg_at_k(["a", "a", "c"], relevance, 2) == approx(1, abs=1e-9)
    assert mod.ndcg_at_k(["a"], {"a": 0}, 3) == 0


@test("metrics stay between 0 and 1 and recall never drops when k grows, for every ordering of a ranking")
def _():
    relevance = {"a": 3, "c": 1, "e": 2}
    ids = ["a", "b", "c", "d", "e"]
    rotations = [ids[shift:] + ids[:shift] for shift in range(len(ids))]
    orderings = [ordering for rotation in rotations for ordering in (rotation, rotation[::-1])]
    for ordering in orderings:
        previous = 0
        for k in range(1, len(ids) + 1):
            recall = mod.recall_at_k(ordering, ["a", "c", "e"], k)
            ndcg = mod.ndcg_at_k(ordering, relevance, k)
            assert recall >= previous
            assert 0 <= ndcg <= 1 + 1e-9
            previous = recall
        assert previous == 1


@test("evaluate_retriever asks for k ids per golden query, scores each one and averages recall@k, MRR and nDCG@k")
async def _():
    async def ranked(query, limit):
        return RANKINGS[query]

    retrieve = SpyRetriever(ranked)
    report = await mod.evaluate_retriever(retrieve, GOLDEN, k=3)
    assert retrieve.calls == [(item["query"], 3) for item in GOLDEN]
    assert report["k"] == 3
    assert [result["query"] for result in report["perQuery"]] == [item["query"] for item in GOLDEN]
    refund, error, sign_on = report["perQuery"]
    assert refund["retrieved"] == RANKINGS["refund timing"]
    assert refund["recall"] == 1
    assert refund["reciprocalRank"] == 1
    assert error["recall"] == 0
    assert error["reciprocalRank"] == 0
    assert error["ndcg"] == 0
    assert sign_on["recall"] == 1
    assert sign_on["ndcg"] == approx(1, abs=1e-9)
    assert refund["ndcg"] == approx((1 + 7 / math.log2(4)) / (7 + 1 / math.log2(3)), abs=1e-9)
    assert report["recallAtK"] == approx(2 / 3, abs=1e-9)
    assert report["mrr"] == approx(2 / 3, abs=1e-9)
    assert report["ndcgAtK"] == approx((refund["ndcg"] + 0 + 1) / 3, abs=1e-9)
    synchronous = await mod.evaluate_retriever(lambda query, limit: RANKINGS[query], GOLDEN, k=1)
    assert synchronous["recallAtK"] == approx((1 / 2 + 0 + 1 / 2) / 3, abs=1e-9)
    assert (await mod.evaluate_retriever(lambda query, limit: RANKINGS[query], GOLDEN))["k"] == 5


@test("compare_retrievers evaluates every retriever on the same golden set and sorts them by nDCG@k, best first")
async def _():
    perfect_rankings = {"refund timing": ["timing", "window"], "error E-4012": ["forwarding"], "single sign-on": ["sso", "audit"]}
    rows = await mod.compare_retrievers(
        {
            "empty": lambda query, limit: [],
            "mixed": lambda query, limit: RANKINGS[query],
            "perfect": lambda query, limit: perfect_rankings[query],
        },
        GOLDEN,
        k=3,
    )
    assert [row["name"] for row in rows] == ["perfect", "mixed", "empty"]
    assert rows[0] == {"name": "perfect", "k": 3, "recallAtK": 1, "mrr": 1, "ndcgAtK": 1}
    assert rows[2] == {"name": "empty", "k": 3, "recallAtK": 0, "mrr": 0, "ndcgAtK": 0}
    assert rows[1]["recallAtK"] == approx(2 / 3, abs=1e-9)
