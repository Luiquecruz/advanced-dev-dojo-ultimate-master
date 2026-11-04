import re

JUDGES = {
    "atlas-pro-2026-05-20": {"provider": "Atlas", "kappa": 0.81},
    "nimbus-mid-2026-08-01": {"provider": "Nimbus", "kappa": 0.74},
    "vega-small-2026-03-01": {"provider": "Vega", "kappa": 0.48},
}
GENERATOR_PROVIDER = "Atlas"
SCORER_KINDS = ["exact", "regex", "schema", "semantic", "judge", "trajectory"]
TRIGGERS = ["thumbs-down", "draft-rewritten", "low-judge-score", "guardrail-hit", "forbidden-call", "model-error"]
ALERTS = ["refusal-rate", "response-model-change", "cost-per-ticket", "online-score-drop", "input-language-mix"]
CRITICAL = ["refund-over-limit", "refund-amount", "account-deletion-request"]
DRAFTS_PER_WEEK = 40000
REVIEW_CAPACITY = 300
NOISE = 0.025
MAX_DROP = 0.05
COST_PER_CASE_RUN = 0.01
CI_BUDGET = 15


def is_integer(value):
    return isinstance(value, int) and not isinstance(value, bool)


def is_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


@test('the ADR is an accepted evaluation-layer decision whose context names regressions and privacy, with a "We will" decision')
def _():
    adr = mod.ADR
    assert is_integer(adr["id"]) and adr["id"] > 0
    assert adr["status"] == "accepted"
    assert adr["layer"] == "evaluation"
    assert len(adr["title"].strip()) >= 10
    assert len(adr["context"].strip()) >= 80
    assert re.search(r"regress|gate|baseline", adr["context"], re.IGNORECASE)
    assert re.search(r"personal data|privacy|PII", adr["context"], re.IGNORECASE)
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


@test("the dataset holds the resolved tickets and every critical scenario, and the scorers cover shape, rules and open qualities")
def _():
    plan = mod.EVAL_PLAN
    assert is_integer(plan["dataset"]["cases"])
    assert plan["dataset"]["cases"] >= 400
    for critical_id in CRITICAL:
        assert critical_id in plan["dataset"]["criticalCases"]
    names = [scorer["name"] for scorer in plan["scorers"]]
    assert len(set(names)) == len(names)
    for scorer in plan["scorers"]:
        assert len(scorer["name"].strip()) > 0
        assert scorer["kind"] in SCORER_KINDS
        assert len(scorer["checks"].strip()) >= 15
    kinds = [scorer["kind"] for scorer in plan["scorers"]]
    for kind in ["schema", "trajectory", "judge"]:
        assert kind in kinds


@test("the judge is calibrated, comes from another provider than the generator, and compares pairs in both orders")
def _():
    plan_judge = mod.EVAL_PLAN["judge"]
    if plan_judge["model"] not in JUDGES:
        raise AssertionError(f'"{plan_judge["model"]}" is not a judge from the briefing table')
    judge = JUDGES[plan_judge["model"]]
    assert judge["kappa"] >= 0.7
    assert judge["provider"] != GENERATOR_PROVIDER
    assert plan_judge["minKappa"] >= 0.7
    assert plan_judge["minKappa"] <= judge["kappa"]
    assert plan_judge["pairwiseBothOrders"] is True


@test("the gate repeats cases, sits between the noise floor and the product rule, blocks critical regressions and fits the CI budget")
def _():
    plan = mod.EVAL_PLAN
    gate = plan["gate"]
    assert is_integer(gate["repeats"])
    assert gate["repeats"] >= 3
    assert is_number(gate["tolerance"])
    assert gate["tolerance"] > NOISE
    assert gate["tolerance"] <= MAX_DROP
    assert gate["blockOnCriticalRegression"] is True
    assert is_integer(gate["pullRequestCases"])
    assert gate["pullRequestCases"] > 0
    assert gate["pullRequestCases"] <= plan["dataset"]["cases"]
    expected = gate["pullRequestCases"] * gate["repeats"] * COST_PER_CASE_RUN
    assert expected <= CI_BUDGET
    assert is_number(gate["projectedCostUsd"])
    assert abs(gate["projectedCostUsd"] - expected) <= expected * 0.1
    assert gate["projectedCostUsd"] <= CI_BUDGET


@test("tracing follows the GenAI conventions without content, and review sampling fits capacity with unbiased and triggered samples")
def _():
    plan = mod.EVAL_PLAN
    assert plan["tracing"]["conventions"] == "opentelemetry-genai"
    assert plan["tracing"]["captureContent"] is False
    online = plan["online"]
    assert is_number(online["randomSampleRate"])
    assert online["randomSampleRate"] > 0
    assert online["triggeredPerWeek"] >= 0
    assert online["randomSampleRate"] * DRAFTS_PER_WEEK + online["triggeredPerWeek"] <= REVIEW_CAPACITY + 1e-9
    for trigger in online["triggers"]:
        assert trigger in TRIGGERS
    assert "forbidden-call" in online["triggers"]
    assert any(trigger in ("thumbs-down", "draft-rewritten") for trigger in online["triggers"])


@test("drift is watched: the offline suite runs on a schedule and alerts catch provider-side changes")
def _():
    drift = mod.EVAL_PLAN["drift"]
    assert drift["scheduledSuite"] in ["daily", "weekly"]
    for alert in drift["alerts"]:
        assert alert in ALERTS
    assert "response-model-change" in drift["alerts"]
    assert "refusal-rate" in drift["alerts"]
