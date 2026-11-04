from dojo_ai import cosine_similarity, embed

PASSAGES = modules["corpus.py"].PASSAGES


class SpyEmbedder:
    def __init__(self, dimensions=64):
        self.dimensions = dimensions
        self.calls = []

    def __call__(self, texts):
        self.calls.append(list(texts))
        return embed(texts, dimensions=self.dimensions)


def loaded_index(embedder=None):
    index = mod.create_vector_index(embedder)
    index.add(PASSAGES)
    return index


def passage_by_id(passage_id):
    return next(passage for passage in PASSAGES if passage["id"] == passage_id)


@test("similarity computes cosine similarity: 1 for the same direction, 0 for orthogonal, -1 for opposite, 0 for a zero vector")
async def _():
    assert mod.similarity([1, 0], [0, 1]) == approx(0, abs=1e-9)
    assert mod.similarity([2, 2], [1, 1]) == approx(1, abs=1e-9)
    assert mod.similarity([1, 2, 3], [-1, -2, -3]) == approx(-1, abs=1e-9)
    assert mod.similarity([0, 0, 0], [1, 2, 3]) == 0
    refund, timing, chat = embed([PASSAGES[1]["text"], PASSAGES[2]["text"], PASSAGES[9]["text"]])
    assert mod.similarity(refund, timing) == approx(cosine_similarity(refund, timing), abs=1e-9)
    assert mod.similarity(refund, chat) == approx(cosine_similarity(refund, chat), abs=1e-9)
    error = await capture_error(lambda: mod.similarity([1, 2], [1, 2, 3]))
    assert isinstance(error, Exception)


@test("search returns the top_k passages ranked by cosine similarity to the query, each with its score and metadata")
def _():
    query = "How long do refunds take to reach my card?"
    results = loaded_index().search(query, top_k=4)
    assert len(results) == 4
    assert results[0]["id"] == "billing-refund-timing"
    query_vector = embed(query)
    for position, result in enumerate(results):
        passage = passage_by_id(result["id"])
        assert result["text"] == passage["text"]
        assert result["metadata"] == passage["metadata"]
        assert result["score"] == approx(cosine_similarity(query_vector, embed(passage["text"])), abs=1e-9)
        if position > 0:
            assert result["score"] <= results[position - 1]["score"]
    assert len(loaded_index().search(query)) == 3


@test("embeds documents once, in one batch, when they are added, and only the query at search time")
def _():
    embedder = SpyEmbedder()
    index = mod.create_vector_index(embedder)
    index.add(PASSAGES)
    assert len(embedder.calls) == 1
    assert embedder.calls[0] == [passage["text"] for passage in PASSAGES]
    index.search("refund", top_k=2)
    index.search("single sign-on", top_k=2)
    assert len(embedder.calls) == 3
    assert embedder.calls[1] == ["refund"]
    assert embedder.calls[2] == ["single sign-on"]


@test("filters by metadata before ranking, so top_k is filled with matching passages even when others score higher")
def _():
    index = loaded_index()
    security = index.search("How long do refunds take to reach my card?", top_k=3, filter={"product": "security"})
    assert len(security) == 3
    for result in security:
        assert result["metadata"]["product"] == "security"
    scale_security = index.search("login", top_k=10, filter={"product": "security", "plan": "scale"})
    assert sorted(result["id"] for result in scale_security) == ["security-audit-log", "security-sso"]
    any_of = index.search("plan", top_k=10, filter={"plan": ["growth", "scale"]})
    assert len(any_of) == 6
    assert index.search("plan", top_k=10, filter={"region": "eu"}) == []
    assert mod.matches_filter({"product": "inbox", "plan": "all"}, {}) is True
    assert mod.matches_filter({"product": "inbox"}, {"product": ["billing", "inbox"]}) is True
    assert mod.matches_filter({"product": "inbox"}, {"product": "inbox", "plan": "all"}) is False


@test("min_score drops weak neighbors, so a query with nothing relevant can return no passages at all")
def _():
    index = loaded_index()
    assert len(index.search("zebra quantum banana", top_k=3)) == 3
    assert index.search("zebra quantum banana", top_k=3, min_score=0.35) == []
    refunds = index.search("refund", top_k=5, min_score=0.35)
    assert [result["id"] for result in refunds] == ["billing-refund-timing", "billing-refund-window"]


@test("adding an existing id replaces its text and vector, and remove deletes a passage from every later search")
def _():
    index = loaded_index()
    assert index.count() == len(PASSAGES)
    index.add([{"id": "billing-refund-timing", "text": "Refunds are paid as account credit only, never to the card.", "metadata": {"product": "billing", "plan": "all", "updated": "2026-10-01"}}])
    assert index.count() == len(PASSAGES)
    [updated] = index.search("refunds paid as account credit", top_k=1)
    assert updated["id"] == "billing-refund-timing"
    assert "account credit only" in updated["text"]
    assert updated["metadata"]["updated"] == "2026-10-01"
    assert index.remove("billing-refund-timing") is True
    assert index.remove("billing-refund-timing") is False
    assert index.count() == len(PASSAGES) - 1
    results = index.search("refund", top_k=20)
    assert not any(result["id"] == "billing-refund-timing" for result in results)


@test("rejects vectors from an embedder with a different dimension and keeps the index unchanged")
async def _():
    embedder = SpyEmbedder(dimensions=64)
    index = mod.create_vector_index(embedder)
    index.add(PASSAGES[:4])
    embedder.dimensions = 128
    error = await capture_error(lambda: index.add(PASSAGES[4:]))
    assert "dimension" in str(error).lower()
    assert index.count() == 4
    embedder.dimensions = 64
    index.add(PASSAGES[4:])
    assert index.count() == len(PASSAGES)
