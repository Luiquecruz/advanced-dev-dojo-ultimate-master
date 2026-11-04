import math

PASSAGES = modules["corpus.py"].PASSAGES

TINY = [
    {"id": "a", "text": "refund policy annual plans refund"},
    {"id": "b", "text": "annual plans billing invoices"},
    {"id": "c", "text": "sso login scale plans"},
    {"id": "d", "text": "error e 4012 forwarding verify"},
]


class SpyRetriever:
    def __init__(self, behavior):
        self.behavior = behavior
        self.calls = []

    def __call__(self, query, limit):
        self.calls.append((query, limit))
        return self.behavior(query, limit)


def idf_formula(total, containing):
    return math.log(1 + (total - containing + 0.5) / (containing + 0.5))


def term_score(idf, frequency, length, average_length, k1=1.2, b=0.75):
    return idf * frequency * (k1 + 1) / (frequency + k1 * (1 - b + b * length / average_length))


@test("idf gives rare terms more weight than common ones, using ln(1 + (N - n + 0.5) / (n + 0.5))")
def _():
    index = mod.create_bm25_index(TINY)
    assert index.idf("refund") == approx(idf_formula(4, 1), abs=1e-9)
    assert index.idf("plans") == approx(idf_formula(4, 3), abs=1e-9)
    assert index.idf("refund") > index.idf("annual")
    assert index.idf("annual") > index.idf("plans")
    assert index.idf("plans") > 0
    assert index.idf("zebra") == approx(idf_formula(4, 0), abs=1e-9)


@test("score sums idf times saturated, length-normalized term frequency over the unique query terms")
def _():
    index = mod.create_bm25_index(TINY)
    average_length = 18 / 4
    expected = term_score(idf_formula(4, 1), 2, 5, average_length) + term_score(idf_formula(4, 3), 1, 5, average_length)
    assert index.score("refund plans", "a") == approx(expected, abs=1e-9)
    assert index.score("refund refund plans", "a") == approx(expected, abs=1e-9)
    assert index.score("plans", "b") == approx(term_score(idf_formula(4, 3), 1, 4, average_length), abs=1e-9)
    assert index.score("zebra", "a") == 0
    custom = mod.create_bm25_index(TINY, k1=2, b=0.5)
    assert custom.score("plans", "c") == approx(term_score(idf_formula(4, 3), 1, 4, average_length, 2, 0.5), abs=1e-9)


@test("term frequency saturates: five mentions score less than five times one mention, and a larger k1 saturates later")
def _():
    documents = [
        {"id": "once", "text": "refund"},
        {"id": "five", "text": "refund refund refund refund refund"},
        {"id": "other", "text": "invoice"},
    ]

    def ratio(k1):
        index = mod.create_bm25_index(documents, k1=k1, b=0)
        return index.score("refund", "five") / index.score("refund", "once")

    assert 1 < ratio(1.2) < 5
    assert ratio(2) > ratio(0.5)


@test("b controls length normalization: 0 ignores length, larger values favor the shorter of two equal matches")
def _():
    documents = [
        {"id": "short", "text": "refund policy"},
        {"id": "long", "text": "refund policy details annual plans card invoices"},
    ]

    def gap(b):
        index = mod.create_bm25_index(documents, b=b)
        return index.score("refund", "short") - index.score("refund", "long")

    assert gap(0) == approx(0, abs=1e-9)
    assert gap(0.75) > 0
    assert gap(1) > gap(0.75)


@test("search returns only documents that share a term with the query, sorted by score, and finds exact codes")
def _():
    index = mod.create_bm25_index(PASSAGES)
    first, *others = index.search("error E-4012")
    assert first["id"] == "inbox-forwarding"
    for result in others:
        assert result["score"] < first["score"]
    results = index.search("refund card", 20)
    assert len(results) > 0
    for position, result in enumerate(results):
        passage = next(candidate for candidate in PASSAGES if candidate["id"] == result["id"])
        assert "refund" in passage["text"].lower() or "card" in passage["text"].lower()
        assert result["score"] == approx(index.score("refund card", result["id"]), abs=1e-9)
        if position > 0:
            assert result["score"] <= results[position - 1]["score"]
    assert len(index.search("refund card", 1)) == 1
    assert index.search("zebra quantum") == []


@test("reciprocal_rank_fusion sums 1 / (k + rank), rewards agreement between lists and ignores repeated ids")
def _():
    fused = mod.reciprocal_rank_fusion([["a", "b", "c"], ["c", "d", "a"]])
    assert [result["id"] for result in fused] == ["a", "c", "b", "d"]
    assert fused[0]["score"] == approx(1 / 61 + 1 / 63, abs=1e-9)
    assert fused[2]["score"] == approx(1 / 62, abs=1e-9)
    agreement = mod.reciprocal_rank_fusion([["x", "p", "y"], ["q", "r", "y"]])
    assert agreement[0]["id"] == "y"
    assert agreement[0]["score"] == approx(2 / 63, abs=1e-9)
    repeated = mod.reciprocal_rank_fusion([["a", "a", "b"]], k=10)
    assert len(repeated) == 2
    assert repeated[0]["score"] == approx(1 / 11, abs=1e-9)
    assert repeated[1]["score"] == approx(1 / 13, abs=1e-9)
    assert len(mod.reciprocal_rank_fusion([["a", "b", "c"]], top_k=2)) == 2


@test("hybrid_search asks every retriever for the candidate count, fuses their rankings and survives a failing retriever")
async def _():
    keyword_ranking = ["inbox-forwarding", "billing-seats", "security-sso"]
    vector_ranking = ["security-sso", "inbox-forwarding", "inbox-chat"]

    async def keyword_behavior(query, limit):
        return keyword_ranking

    async def broken_behavior(query, limit):
        raise ConnectionError("index offline")

    keyword = SpyRetriever(keyword_behavior)
    vector = SpyRetriever(lambda query, limit: vector_ranking)
    fused = await mod.hybrid_search("error E-4012", [keyword, vector], top_k=3)
    assert keyword.calls == [("error E-4012", 20)]
    assert vector.calls == [("error E-4012", 20)]
    assert fused == mod.reciprocal_rank_fusion([keyword_ranking, vector_ranking], top_k=3)
    assert [result["id"] for result in fused] == ["inbox-forwarding", "security-sso", "billing-seats"]
    broken = SpyRetriever(broken_behavior)
    degraded = await mod.hybrid_search("sso", [broken, vector], candidates=5, top_k=2)
    assert broken.calls == [("sso", 5)]
    assert [result["id"] for result in degraded] == ["security-sso", "inbox-forwarding"]
    error = await capture_error(mod.hybrid_search("sso", [broken, broken]))
    assert isinstance(error, Exception)
