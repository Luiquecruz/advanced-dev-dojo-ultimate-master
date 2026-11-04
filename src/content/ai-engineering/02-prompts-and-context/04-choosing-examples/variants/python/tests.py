from dojo_ai import cosine_similarity, count_tokens, create_model, embed

POOL = [
    {"id": "refund-late", "input": "My refund has not arrived after two weeks.", "output": "billing"},
    {"id": "refund-card", "input": "Where is the refund for my card payment?", "output": "billing"},
    {"id": "refund-late-copy", "input": "My refund has NOT arrived after two weeks!", "output": "billing"},
    {"id": "refund-still", "input": "My refund still has not arrived after two weeks.", "output": "billing"},
    {
        "id": "charged-twice",
        "input": (
            "I was charged twice for the same order and need a refund of the duplicate payment, my bank statement shows both "
            "charges on the same day and the support chat closed before I could explain everything about the refund."
        ),
        "output": "billing",
    },
    {"id": "export-crash", "input": "The export button crashes the app.", "output": "bug"},
    {"id": "password-reset", "input": "I cannot reset my password.", "output": "account"},
    {"id": "invoice-vat", "input": "The invoice shows the wrong VAT number.", "output": "billing"},
    {"id": "parcel-stuck", "input": "The parcel tracking has not moved for a week.", "output": "shipping"},
]
QUERY = "When will my refund arrive?"
LABELS = ["billing", "shipping", "account", "bug"]


def ids(selected):
    return [example["id"] for example in selected]


def tokens_of(selected):
    return sum(count_tokens(example["input"]) + count_tokens(example["output"]) for example in selected)


@test("picks the k most similar examples by embedding cosine similarity and returns them most similar last, with their scores")
def _():
    selected = mod.select_examples(QUERY, POOL, k=3, max_tokens=1000)
    assert ids(selected) == ["charged-twice", "refund-late", "refund-card"]
    for example in selected:
        expected_score = cosine_similarity(embed(QUERY), embed(example["input"]))
        assert example["score"] == approx(expected_score, abs=1e-9)
        pool_entry = {"id": example["id"], "input": example["input"], "output": example["output"]}
        assert pool_entry in POOL
    scores = [example["score"] for example in selected]
    assert sorted(scores) == scores


@test("skips near-duplicates of an example already chosen, keeping the first one in pool order on equal scores")
def _():
    selected = mod.select_examples(QUERY, POOL, k=3, max_tokens=1000)
    assert "refund-late-copy" not in ids(selected)
    assert "refund-still" not in ids(selected)
    copy_first = [POOL[2], *[example for index, example in enumerate(POOL) if index != 2]]
    assert ids(mod.select_examples(QUERY, copy_first, k=3, max_tokens=1000)) == ["charged-twice", "refund-late-copy", "refund-card"]
    without_dedupe = mod.select_examples(QUERY, POOL, k=3, max_tokens=1000, duplicate_threshold=1.01)
    assert ids(without_dedupe) == ["refund-late-copy", "refund-late", "refund-card"]


@test("stays within the token budget, skipping a long example but still taking a shorter, less similar one")
def _():
    selected = mod.select_examples(QUERY, POOL, k=3, max_tokens=40)
    assert ids(selected) == ["export-crash", "refund-late", "refund-card"]
    assert tokens_of(selected) <= 40
    assert mod.select_examples(QUERY, POOL, k=3, max_tokens=5) == []


@test("drops examples below the minimum similarity, returning fewer than k or none")
def _():
    assert ids(mod.select_examples(QUERY, POOL, k=3, max_tokens=1000, min_similarity=0.3)) == ["refund-late", "refund-card"]
    assert mod.select_examples(QUERY, POOL, k=3, max_tokens=1000, min_similarity=0.9) == []
    assert ids(mod.select_examples("The app crashes when I export a report", POOL, k=1, max_tokens=1000, min_similarity=0.3)) == ["export-crash"]


@test("builds the few-shot conversation: system, one user and assistant pair per example in order, then the query")
def _():
    examples = POOL[:2]
    assert mod.build_few_shot_messages("Classify tickets.", QUERY, examples) == [
        {"role": "system", "content": "Classify tickets."},
        {"role": "user", "content": POOL[0]["input"]},
        {"role": "assistant", "content": "billing"},
        {"role": "user", "content": POOL[1]["input"]},
        {"role": "assistant", "content": "billing"},
        {"role": "user", "content": QUERY},
    ]
    assert len(mod.build_few_shot_messages("Classify tickets.", QUERY, [])) == 2


@test("classify_with_examples sends the selected examples and normalizes any phrasing of the label, or returns None")
async def _():
    phrasings = ["billing", "Billing.", "  BILLING\n", "I think this is billing", "refunds"]

    async def scenario():
        fake_model.reply(respond.text(phrasings))
        result = await mod.classify_with_examples(create_model(), system="Classify tickets.", query=QUERY, pool=POOL, labels=LABELS, k=3, max_tokens=40)
        assert result["exampleIds"] == ["export-crash", "refund-late", "refund-card"]
        sent = fake_model.requests[0]["messages"]
        assert sent == mod.build_few_shot_messages("Classify tickets.", QUERY, mod.select_examples(QUERY, POOL, k=3, max_tokens=40))
        reply = fake_model.responses[0]["text"]
        expected = "billing" if reply in ["billing", "Billing.", "  BILLING\n"] else None
        assert result["label"] == expected

    await for_each_seed(15, scenario)
