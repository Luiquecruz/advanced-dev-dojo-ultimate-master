import inspect

from dojo_ai import cosine_similarity, create_model, embed

TICKET_SCHEMA = {
    "type": "object",
    "properties": {
        "category": {"enum": ["billing", "shipping", "account"]},
        "priority": {"type": "integer", "minimum": 1, "maximum": 3},
    },
    "required": ["category", "priority"],
}

CLASSIFICATION_SET = [
    {"id": "vat", "input": "My invoice shows the wrong VAT number.", "expected": "billing"},
    {"id": "parcel", "input": "The parcel tracking has not moved for a week.", "expected": "shipping"},
    {"id": "password", "input": "I cannot reset my password.", "expected": "account"},
    {"id": "refund", "input": "I was charged twice for one order.", "expected": "billing"},
]


def classify(eval_case):
    return {
        "messages": [
            {"role": "system", "content": "Answer with one category: billing, shipping or account."},
            {"role": "user", "content": eval_case["input"]},
        ]
    }


async def score_with(scorer, output, eval_case):
    result = scorer.score(output, eval_case)
    return await result if inspect.isawaitable(result) else result


class BrokenJudge:
    """A scorer whose backend is down."""

    name = "judge"

    async def score(self, output, eval_case):
        raise RuntimeError("judge unavailable")


@test("exact_scorer ignores case, surrounding whitespace and punctuation, but never accepts different words")
async def _():
    scorer = mod.exact_scorer()
    assert scorer.name == "exact"
    eval_case = {"id": "vat", "input": "My invoice shows the wrong VAT number.", "expected": "Billing"}
    for output in ["billing", "  Billing.\n", '"BILLING"', "billing!"]:
        result = await score_with(scorer, output, eval_case)
        assert result["pass"] is True, output
        assert result["score"] == 1
    multiple_words = await score_with(scorer, "credit   card", {"id": "card", "input": "", "expected": "Credit card"})
    assert multiple_words["pass"] is True
    for output in ["billing issue", "shipping", "bill ing", ""]:
        result = await score_with(scorer, output, eval_case)
        assert result["pass"] is False, output
        assert result["score"] == 0
        assert len(result["detail"].strip()) > 0


@test("schema_scorer passes JSON that matches the schema and fails, with a reason, every malformed shape and schema violation")
async def _():
    scorer = mod.schema_scorer(TICKET_SCHEMA)
    assert scorer.name == "schema"
    eval_case = {"id": "vat", "input": "My invoice shows the wrong VAT number."}
    compact = await score_with(scorer, '{"category":"billing","priority":2}', eval_case)
    assert compact["pass"] is True and compact["score"] == 1
    padded = await score_with(scorer, '\n {"category":"shipping","priority":1} ', eval_case)
    assert padded["pass"] is True and padded["score"] == 1
    wrong_category = await score_with(scorer, '{"category":"refunds","priority":2}', eval_case)
    assert wrong_category["pass"] is False and wrong_category["score"] == 0
    assert "category" in wrong_category["detail"]
    for output in ['{"category":"billing"}', '{"category":"billing","priority":7}', "[]", "billing"]:
        result = await score_with(scorer, output, eval_case)
        assert result["pass"] is False and result["score"] == 0, output
        assert len(result["detail"].strip()) > 0

    async def scenario():
        fake_model.reply(respond.malformed_json({"category": "billing", "priority": 2}))
        text = (await create_model().generate({"messages": [{"role": "user", "content": "Classify as JSON"}]}))["text"]
        result = await score_with(scorer, text, eval_case)
        assert result["pass"] is False and result["score"] == 0, text
        assert len(result["detail"].strip()) > 0

    await for_each_seed(12, scenario)


@test("semantic_scorer scores by embedding similarity and passes at or above the threshold")
async def _():
    scorer = mod.semantic_scorer(threshold=0.6)
    assert scorer.name == "semantic"
    expected = "Refunds reach the original card within 5 business days."
    eval_case = {"id": "refund-timing", "input": "When do I get my money back?", "expected": expected}
    outputs = {
        "paraphrase": "Your refund reaches the card you paid with in 5 business days.",
        "reordered": "Refunds take 5 business days to reach your original card.",
        "unrelated": "Our office is closed on public holidays.",
        "contradiction": "We do not offer refunds.",
    }
    for output in outputs.values():
        result = await score_with(scorer, output, eval_case)
        similarity = cosine_similarity(embed(output), embed(expected))
        assert result["score"] == approx(similarity, abs=1e-6)
        assert result["pass"] is (similarity >= 0.6)
    assert (await score_with(scorer, outputs["paraphrase"], eval_case))["pass"] is True
    assert (await score_with(scorer, outputs["unrelated"], eval_case))["pass"] is False
    assert (await score_with(mod.semantic_scorer(threshold=0.9), outputs["paraphrase"], eval_case))["pass"] is False


@test("run_eval sends each case through the prompt in dataset order and reports every case and the pass rate")
async def _():
    fake_model.reply(respond.text("Billing."), respond.text("account"), respond.text(["account", "Account"]), respond.text("billing"))
    report = await mod.run_eval(model=create_model(), dataset=CLASSIFICATION_SET, prompt=classify, scorers=[mod.exact_scorer()])
    assert [request["messages"][-1]["content"] for request in fake_model.requests] == [eval_case["input"] for eval_case in CLASSIFICATION_SET]
    assert [[result["id"], result["pass"]] for result in report["cases"]] == [
        ["vat", True],
        ["parcel", False],
        ["password", True],
        ["refund", True],
    ]
    assert report["cases"][1]["output"] == "account"
    assert report["cases"][1]["error"] is None
    assert report["cases"][1]["scores"]["exact"]["pass"] is False
    summary = report["summary"]
    assert [summary["total"], summary["passed"], summary["failed"], summary["errored"]] == [4, 3, 1, 0]
    assert summary["passRate"] == approx(0.75, abs=1e-6)
    assert [summary["byScorer"]["exact"]["passed"], summary["byScorer"]["exact"]["total"]] == [3, 4]
    assert summary["byScorer"]["exact"]["meanScore"] == approx(0.75, abs=1e-6)


@test("run_eval counts model errors as failed cases, keeps their message and goes on with the next case")
async def _():
    fake_model.reply(respond.error(429), respond.text("shipping"), respond.context_length(), respond.error(500, message="upstream exploded"))
    report = await mod.run_eval(model=create_model(), dataset=CLASSIFICATION_SET, prompt=classify, scorers=[mod.exact_scorer()])
    assert len(fake_model.requests) == 4
    rate_limited, parcel, too_long, broken = report["cases"]
    for failed in [rate_limited, too_long, broken]:
        assert failed["output"] is None
        assert failed["pass"] is False
        assert failed["scores"] == {}
        assert isinstance(failed["error"], str)
        assert len(failed["error"]) > 0
    assert "upstream exploded" in broken["error"]
    assert parcel["id"] == "parcel"
    assert parcel["output"] == "shipping"
    assert parcel["error"] is None
    assert parcel["pass"] is True
    summary = report["summary"]
    assert [summary["total"], summary["passed"], summary["failed"], summary["errored"]] == [4, 1, 3, 3]
    assert [summary["byScorer"]["exact"]["passed"], summary["byScorer"]["exact"]["total"]] == [1, 4]
    assert summary["byScorer"]["exact"]["meanScore"] == approx(0.25, abs=1e-6)


@test("a scorer that raises fails its own score with the reason and never stops the run or the other scorers")
async def _():
    dataset = [
        {"id": "with-reference", "input": "When do I get my money back?", "expected": "Refunds reach the original card within 5 business days."},
        {"id": "without-reference", "input": "Do you ship to Iceland?"},
    ]
    fake_model.reply(respond.text("Refunds reach your original card within 5 business days."), respond.text("Yes, we ship to Iceland."))
    report = await mod.run_eval(model=create_model(), dataset=dataset, prompt=classify, scorers=[mod.semantic_scorer(threshold=0.6), BrokenJudge()])
    assert len(report["cases"]) == 2
    for result in report["cases"]:
        assert result["error"] is None
        assert result["scores"]["judge"]["pass"] is False
        assert result["scores"]["judge"]["score"] == 0
        assert "judge unavailable" in result["scores"]["judge"]["detail"]
        assert result["pass"] is False
    assert report["cases"][0]["scores"]["semantic"]["pass"] is True
    missing_reference = report["cases"][1]["scores"]["semantic"]
    assert missing_reference["pass"] is False
    assert missing_reference["score"] == 0
    assert len(missing_reference["detail"].strip()) > 0
    by_scorer = report["summary"]["byScorer"]
    assert [by_scorer["semantic"]["passed"], by_scorer["semantic"]["total"]] == [1, 2]
    assert [by_scorer["judge"]["passed"], by_scorer["judge"]["total"], by_scorer["judge"]["meanScore"]] == [0, 2, 0]


@test("the summary stays consistent with the case results across every mix of valid, malformed, wrong and failed replies")
async def _():
    dataset = [{"id": case_id, "input": f"Ticket {case_id}"} for case_id in ["a", "b", "c", "d", "e", "f", "g", "h"]]

    async def scenario():
        fake_model.handle(
            lambda request, context: respond.one_of(
                [
                    respond.json({"category": "billing", "priority": 2}),
                    respond.malformed_json({"category": "billing", "priority": 2}),
                    respond.json({"category": "refunds", "priority": 1}),
                    respond.error(503),
                ]
            )
        )
        report = await mod.run_eval(model=create_model(), dataset=dataset, prompt=classify, scorers=[mod.schema_scorer(TICKET_SCHEMA)])
        cases = report["cases"]
        assert len(cases) == len(dataset)
        assert [result["output"] for result in cases if result["output"] is not None] == [response["text"] for response in fake_model.responses]
        passing = sum(1 for result in cases if result["pass"])
        errored = sum(1 for result in cases if result["error"] is not None)
        summary = report["summary"]
        assert [summary["total"], summary["passed"], summary["failed"], summary["errored"]] == [len(dataset), passing, len(dataset) - passing, errored]
        assert summary["passRate"] == approx(passing / len(dataset), abs=1e-6)
        assert summary["byScorer"]["schema"]["passed"] == passing
        mean_score = sum(result["scores"]["schema"]["score"] for result in cases if "schema" in result["scores"]) / len(dataset)
        assert summary["byScorer"]["schema"]["meanScore"] == approx(mean_score, abs=1e-6)
        for result in cases:
            if result["error"] is not None:
                assert result["scores"] == {}
            else:
                assert result["pass"] is (result["output"] == '{"category":"billing","priority":2}')

    await for_each_seed(10, scenario)
