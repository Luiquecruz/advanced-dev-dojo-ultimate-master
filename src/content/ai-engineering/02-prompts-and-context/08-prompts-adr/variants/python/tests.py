import re

VALID_AFTER_ATTEMPTS = {1: 0.965, 2: 0.996, 3: 0.998}
EXAMPLE_ACCURACY = {"none": 0.74, "static": 0.81, "similarity": 0.93}
PARTS = ["instructions", "output-schema", "examples", "attachment", "claim"]
CALL_P95_MS = 1100
LATENCY_BUDGET_MS = 3000
CONTEXT_WINDOW = 32000
LARGEST_RECORD_TOKENS = 700
ATTACHMENT_LIMIT = 4000
BACKFILL_BUDGET_USD = 6000


def stable_parts():
    return ["instructions", "output-schema", "examples"] if mod.PROMPT_PLAN["examples"]["strategy"] == "static" else ["instructions", "output-schema"]


def expected_backfill_cost():
    interactive = 1_200_000 * (3000 * 2 + 300 * 8) / 1_000_000
    return interactive * 0.5 if mod.PROMPT_PLAN["processing"]["backfill"] == "batch" else interactive


@test('the ADR is an accepted context-layer decision whose context names latency, cost and the schema, with a "We will" decision')
def _():
    adr = mod.ADR
    assert isinstance(adr["id"], int) and adr["id"] > 0
    assert adr["status"] == "accepted"
    assert adr["layer"] == "context"
    assert len(adr["title"].strip()) >= 10
    assert len(adr["context"].strip()) >= 80
    assert re.search(r"latency|p95|\bms\b", adr["context"], re.IGNORECASE)
    assert re.search(r"cost|budget|\$", adr["context"], re.IGNORECASE)
    assert re.search(r"schema|structured|json", adr["context"], re.IGNORECASE)
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


@test("the output is schema-constrained, validated locally, and the attempt limit meets both the validity target and the latency budget")
def _():
    output = mod.PROMPT_PLAN["output"]
    assert output["mode"] == "json-schema"
    assert output["validateLocally"] is True
    attempts = output["maxAttempts"]
    assert isinstance(attempts, int)
    assert VALID_AFTER_ATTEMPTS.get(attempts, 0) >= 0.995
    assert attempts * CALL_P95_MS <= LATENCY_BUDGET_MS


@test("the example strategy reaches 90% accuracy with a measured count, within the 800-token example budget")
def _():
    examples = mod.PROMPT_PLAN["examples"]
    assert EXAMPLE_ACCURACY.get(examples["strategy"], 0) >= 0.9
    assert 3 <= examples["count"] <= 6
    assert 0 < examples["maxTokens"] <= 800


@test("the layout sends every part once with the claim last, stable parts first, and caches exactly the stable prefix")
def _():
    layout = mod.PROMPT_PLAN["layout"]
    assert sorted(layout) == sorted(PARTS)
    assert layout[-1] == "claim"
    stable = stable_parts()
    assert sorted(layout[: len(stable)]) == sorted(stable)
    assert mod.PROMPT_PLAN["cacheBreakpointAfter"] == layout[len(stable) - 1]


@test("the context budget fits the window with room for the largest record, and attachments are capped where accuracy held")
def _():
    context = mod.PROMPT_PLAN["context"]
    input_budget_tokens = context["inputBudgetTokens"]
    output_reserve_tokens = context["outputReserveTokens"]
    max_attachment_tokens = context["maxAttachmentTokens"]
    assert input_budget_tokens + output_reserve_tokens <= CONTEXT_WINDOW
    assert output_reserve_tokens >= LARGEST_RECORD_TOKENS
    assert 0 < max_attachment_tokens <= ATTACHMENT_LIMIT
    assert max_attachment_tokens < input_budget_tokens


@test("live claims run interactively, the backfill fits its budget with a matching projection, and versions pass staging before production")
def _():
    plan = mod.PROMPT_PLAN
    assert plan["processing"]["live"] == "interactive"
    assert plan["processing"]["backfill"] in ["interactive", "batch"]
    expected = expected_backfill_cost()
    assert abs(plan["backfillCostUsd"] - expected) <= expected * 0.1
    assert expected <= BACKFILL_BUDGET_USD
    assert re.fullmatch(r"claim-intake@\d+\.\d+\.\d+", plan["promptVersion"])
    assert plan["environments"] == ["staging", "production"]
