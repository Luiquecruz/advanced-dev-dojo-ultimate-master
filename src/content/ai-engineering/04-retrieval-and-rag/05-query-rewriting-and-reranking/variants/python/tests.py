from dojo_ai import create_model

QUESTION = "How long until my refund arrives?"
CANDIDATES = [
    {"id": "billing-seats", "text": "Brightdesk bills per agent seat."},
    {"id": "billing-refund-window", "text": "Annual plans can be refunded in full within 30 days of purchase."},
    {"id": "billing-refund-timing", "text": "Refunds reach the original card within 5 to 10 business days."},
    {"id": "security-sso", "text": "Single sign-on with SAML is available on the Scale plan."},
]
ORIGINAL_ORDER = [candidate["id"] for candidate in CANDIDATES]
SCORES = {
    "scores": [
        {"id": "billing-seats", "score": 1},
        {"id": "billing-refund-window", "score": 6},
        {"id": "billing-refund-timing", "score": 9},
        {"id": "security-sso", "score": 0},
    ],
}
EXPECTED_ORDER = ["billing-refund-timing", "billing-refund-window", "billing-seats", "security-sso"]


def ids(results):
    return [result["id"] for result in results]


def last_request_text():
    return "\n".join(message["content"] for message in fake_model.requests[-1]["messages"])


@test("parse_json_loosely reads valid JSON, JSON wrapped in prose and a fence, trailing commas and single quotes, and returns None when nothing is recoverable")
def _():
    assert mod.parse_json_loosely('{"queries": ["a", "b"]}') == {"queries": ["a", "b"]}
    assert mod.parse_json_loosely('Sure! Here it is:\n```json\n{"score": 7}\n```') == {"score": 7}
    assert mod.parse_json_loosely('{"score": 7,}') == {"score": 7}
    assert mod.parse_json_loosely("{'scores': [{'id': 'a', 'score': 3}]}") == {"scores": [{"id": "a", "score": 3}]}
    assert mod.parse_json_loosely('The answer is {"score": 4} as requested.') == {"score": 4}
    assert mod.parse_json_loosely('{"scores": [{"id": "a", "sco') is None
    assert mod.parse_json_loosely("I cannot score these passages.") is None


@test("generate_queries asks for JSON and returns the original question first, then unique, non-empty rewrites, at most count + 1")
async def _():
    fake_model.reply(respond.json({"queries": ["refund processing time", "how long until my refund arrives?", "", 42, "Refund processing time", "when is money returned to my card", "refund delay annual plan"]}))
    queries = await mod.generate_queries(create_model(), QUESTION, count=2)
    assert queries == [QUESTION, "refund processing time", "when is money returned to my card"]
    assert len(fake_model.requests) == 1
    assert fake_model.requests[0]["responseFormat"] == {"type": "json"}
    assert QUESTION in last_request_text()


@test("generate_queries never breaks retrieval: malformed JSON, refusals, errors and wrong shapes fall back to the original question")
async def _():
    recovered = 0

    async def scenario():
        nonlocal recovered
        fake_model.reply(respond.malformed_json({"queries": ["refund processing time", "money back to card"]}))
        queries = await mod.generate_queries(create_model(), QUESTION)
        assert queries[0] == QUESTION
        assert len(queries) in (1, 3)
        recovered += 1 if len(queries) == 3 else 0

    await for_each_seed(20, scenario)
    assert recovered > 0
    for behavior in [respond.refusal(), respond.error(500), respond.json({"rewrites": ["x"]}), respond.json({"queries": "refund"}), respond.content_filter()]:
        fake_model.reset().reply(behavior)
        assert await mod.generate_queries(create_model(), QUESTION) == [QUESTION]


@test("hyde_query appends a hypothetical answer passage to the question, and falls back to the question alone when there is none")
async def _():
    fake_model.reply(respond.text(["Refunds are sent to the original card and arrive within a week.", "Most refunds reach your bank in 5 to 10 business days."]))
    expanded = await mod.hyde_query(create_model(), QUESTION)
    assert expanded.startswith(QUESTION)
    assert len(expanded) > len(QUESTION) + 20
    assert QUESTION in last_request_text()
    fake_model.reset().reply(respond.truncated("Refunds are sent back to the card you paid with, usually within ten business days of approval.", 0.5))
    assert len(await mod.hyde_query(create_model(), QUESTION)) > len(QUESTION)
    for behavior in [respond.refusal(), respond.content_filter(), respond.error(503), respond.text("   ")]:
        fake_model.reset().reply(behavior)
        assert await mod.hyde_query(create_model(), QUESTION) == QUESTION


@test("rerank sends the query and every candidate in one JSON request and orders candidates by the model scores")
async def _():
    fake_model.reply(respond.json(SCORES))
    reranking = await mod.rerank(create_model(), QUESTION, CANDIDATES)
    results = reranking["results"]
    assert reranking["reranked"] is True
    assert ids(results) == EXPECTED_ORDER
    assert [result["score"] for result in results] == [9, 6, 1, 0]
    assert results[0]["text"] == CANDIDATES[2]["text"]
    assert len(fake_model.requests) == 1
    assert fake_model.requests[0]["responseFormat"] == {"type": "json"}
    prompt = last_request_text()
    assert QUESTION in prompt
    for candidate_id in ORIGINAL_ORDER:
        assert candidate_id in prompt
    fake_model.reset().reply(respond.json(SCORES))
    top_two = await mod.rerank(create_model(), QUESTION, CANDIDATES, top_k=2)
    assert ids(top_two["results"]) == EXPECTED_ORDER[:2]


@test("rerank ignores unknown ids, duplicates and scores that are missing, non-numeric or outside 0 to 10, keeping unscored candidates after scored ones")
async def _():
    fake_model.reply(
        respond.json({
            "scores": [
                {"id": "billing-refund-window", "score": 4},
                {"id": "made-up-id", "score": 10},
                {"id": "billing-refund-window", "score": 10},
                {"id": "billing-seats", "score": "high"},
                {"id": "security-sso", "score": 42},
                {"id": "billing-refund-timing"},
                None,
            ],
        }),
    )
    reranking = await mod.rerank(create_model(), QUESTION, CANDIDATES)
    assert reranking["reranked"] is True
    assert ids(reranking["results"]) == ["billing-refund-window", "billing-seats", "billing-refund-timing", "security-sso"]
    assert [result["score"] for result in reranking["results"]] == [4, None, None, None]


@test("rerank survives every malformed reply, refusal and error by keeping the retrieval order, and skips the model for no candidates")
async def _():
    reranked_runs = 0

    async def scenario():
        nonlocal reranked_runs
        fake_model.reply(respond.malformed_json(SCORES))
        reranking = await mod.rerank(create_model(), QUESTION, CANDIDATES)
        order = ids(reranking["results"])
        assert sorted(order) == sorted(ORIGINAL_ORDER)
        assert order == (EXPECTED_ORDER if reranking["reranked"] else ORIGINAL_ORDER)
        reranked_runs += 1 if reranking["reranked"] else 0

    await for_each_seed(20, scenario)
    assert reranked_runs > 0
    for behavior in [respond.refusal(), respond.error(429), respond.text("These all look relevant to me."), respond.json({"ranking": EXPECTED_ORDER})]:
        fake_model.reset().reply(behavior)
        reranking = await mod.rerank(create_model(), QUESTION, CANDIDATES)
        assert reranking["reranked"] is False
        assert ids(reranking["results"]) == ORIGINAL_ORDER
        for result in reranking["results"]:
            assert result["score"] is None
    fake_model.reset()
    assert await mod.rerank(create_model(), QUESTION, []) == {"results": [], "reranked": False}
    assert len(fake_model.requests) == 0
