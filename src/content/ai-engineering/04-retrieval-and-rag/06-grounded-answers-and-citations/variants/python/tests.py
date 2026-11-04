import re

from dojo_ai import create_model

QUESTION = "When will my annual plan refund reach my card?"
PASSAGES = [
    {"id": "billing-seats", "source": "handbook/billing.md", "text": "Brightdesk bills per agent seat.", "score": 0.31},
    {"id": "automations-rules", "source": "handbook/automations.md", "text": "Automations close tickets with no reply after 7 days.", "score": 0.12},
    {"id": "billing-refund-timing", "source": "handbook/billing.md", "text": "Refunds reach the original card within 5 to 10 business days.", "score": 0.62},
    {"id": "billing-refund-window", "source": "handbook/refunds.md", "text": "Annual plans can be refunded in full within 30 days of purchase.", "score": 0.48},
]


def request_text(index):
    return "\n".join(message["content"] for message in fake_model.requests[index]["messages"])


@test("build_context keeps passages at or above min_score, best first, at most max_passages, numbered from 1 with their source")
def _():
    built = mod.build_context(PASSAGES, min_score=0.3, max_passages=2)
    assert built["sources"] == [
        {"number": 1, "id": "billing-refund-timing", "source": "handbook/billing.md", "text": PASSAGES[2]["text"]},
        {"number": 2, "id": "billing-refund-window", "source": "handbook/refunds.md", "text": PASSAGES[3]["text"]},
    ]
    assert built["context"] == f"[1] (handbook/billing.md) {PASSAGES[2]['text']}\n\n[2] (handbook/refunds.md) {PASSAGES[3]['text']}"
    assert [source["id"] for source in mod.build_context(PASSAGES)["sources"]] == ["billing-refund-timing", "billing-refund-window", "billing-seats"]
    assert mod.build_context(PASSAGES, min_score=0.9) == {"sources": [], "context": ""}


@test("extract_citations returns the unique [n] markers in order of first appearance")
def _():
    assert mod.extract_citations("Refunds take 5 to 10 days [2]. Annual plans qualify [1] within 30 days [2].") == [2, 1]
    assert mod.extract_citations("See [1][3] and [12].") == [1, 3, 12]
    assert mod.extract_citations("No sources here, [a] or (1).") == []


@test("refuses without calling the model when no passage reaches the evidence threshold")
async def _():
    result = await mod.answer_with_citations(create_model(), QUESTION, PASSAGES, min_score=0.7)
    assert result == {"status": "no_evidence", "answer": None, "citations": [], "attempts": 0}
    assert len(fake_model.requests) == 0
    assert (await mod.answer_with_citations(create_model(), QUESTION, []))["status"] == "no_evidence"


@test("answers with citations mapped to the provided sources, whatever valid citation style the model uses")
async def _():
    expected_citations = [
        {"number": 1, "id": "billing-refund-timing", "source": "handbook/billing.md"},
        {"number": 2, "id": "billing-refund-window", "source": "handbook/refunds.md"},
    ]

    async def scenario():
        fake_model.reply(
            respond.text([
                "Annual plans are refundable within 30 days [2], and the money reaches your card within 5 to 10 business days [1].",
                "Your refund should reach the card within 5 to 10 business days [1][2].",
                "Within 5 to 10 business days [1]. Annual plans qualify during the first 30 days [2] [1].",
            ]),
        )
        result = await mod.answer_with_citations(create_model(), QUESTION, PASSAGES)
        assert result["status"] == "answered"
        assert result["attempts"] == 1
        assert result["answer"] == fake_model.responses[0]["text"]
        assert len(result["citations"]) > 0
        for citation in result["citations"]:
            assert citation == expected_citations[citation["number"] - 1]

    await for_each_seed(10, scenario)


@test("puts numbered sources and the question in the prompt, tells the model to cite, and leaves out passages below the threshold")
async def _():
    fake_model.reply(respond.text("Within 5 to 10 business days [1]."))
    await mod.answer_with_citations(create_model(), QUESTION, PASSAGES, min_score=0.4)
    request = fake_model.requests[0]
    assert request["messages"][0]["role"] == "system"
    assert re.search(r"cite|citation|\[1\]", request["messages"][0]["content"], re.IGNORECASE)
    prompt = request_text(0)
    assert QUESTION in prompt
    assert f"[1] (handbook/billing.md) {PASSAGES[2]['text']}" in prompt
    assert f"[2] (handbook/refunds.md) {PASSAGES[3]['text']}" in prompt
    assert PASSAGES[0]["text"] not in prompt
    assert PASSAGES[1]["text"] not in prompt


@test("asks again once when the answer cites a source that was not provided, naming the valid numbers")
async def _():
    fake_model.reply(respond.text("Refunds take 5 to 10 business days [1], as the billing policy says [4]."), respond.text("Refunds take 5 to 10 business days [1]."))
    result = await mod.answer_with_citations(create_model(), QUESTION, PASSAGES)
    assert result["status"] == "answered"
    assert result["attempts"] == 2
    assert result["citations"] == [{"number": 1, "id": "billing-refund-timing", "source": "handbook/billing.md"}]
    assert len(fake_model.requests) == 2
    retry = fake_model.requests[1]["messages"]
    assert len(retry) > len(fake_model.requests[0]["messages"])
    assert any(message["role"] == "assistant" and "[4]" in message["content"] for message in retry)
    feedback = retry[-1]
    assert feedback["role"] == "user"
    assert "[1]" in feedback["content"]
    assert "[3]" in feedback["content"]


@test("withholds the answer as ungrounded after two attempts without valid citations, counting refusals and truncated replies as failures")
async def _():
    failures = [
        [respond.text("Refunds usually take about a week."), respond.text("It takes 5 to 10 business days [7].")],
        [respond.refusal(), respond.truncated("Refunds reach the original card within 5 to 10 business days [1].", 0.4)],
        [respond.truncated("Refunds reach the card [1] within 5 to 10 business days, as the policy says.", 0.5), respond.content_filter()],
    ]
    for replies in failures:
        fake_model.reset().reply(*replies, respond.text("Too late [1]."))
        result = await mod.answer_with_citations(create_model(), QUESTION, PASSAGES)
        assert result == {"status": "ungrounded", "answer": None, "citations": [], "attempts": 2}
        assert len(fake_model.requests) == 2
    fake_model.reset().reply(respond.error(500))
    error = await capture_error(mod.answer_with_citations(create_model(), QUESTION, PASSAGES))
    assert error.status == 500
