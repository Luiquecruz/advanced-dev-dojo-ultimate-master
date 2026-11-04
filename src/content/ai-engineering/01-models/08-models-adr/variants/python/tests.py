import re

CANDIDATES = {
    "atlas-mini-2026-07-15": {"provider": "Atlas", "eu": True, "p95Ms": 400, "costPerThousand": 0.5, "fixedMonthly": 0, "accuracy": 0.89, "rejectionRate": 0.15},
    "atlas-pro-2026-05-20": {"provider": "Atlas", "eu": True, "p95Ms": 2600, "costPerThousand": 9, "fixedMonthly": 0, "accuracy": 0.96, "rejectionRate": 0.02},
    "atlas-think-2026-06-02": {"provider": "Atlas", "eu": True, "p95Ms": 11000, "costPerThousand": 30, "fixedMonthly": 0, "accuracy": 0.97, "rejectionRate": 0.01},
    "nimbus-mid-2026-08-01": {"provider": "Nimbus", "eu": True, "p95Ms": 1000, "costPerThousand": 2.5, "fixedMonthly": 0, "accuracy": 0.94, "rejectionRate": 0.03},
    "vega-flash-2026-04-10": {"provider": "Vega", "eu": False, "p95Ms": 700, "costPerThousand": 1.2, "fixedMonthly": 0, "accuracy": 0.93, "rejectionRate": 0.04},
    "tern-14b-q4": {"provider": "self-hosted", "eu": True, "p95Ms": 900, "costPerThousand": 0, "fixedMonthly": 1500, "accuracy": 0.91, "rejectionRate": 0.09},
}

TICKETS_PER_MONTH_IN_THOUSANDS = 1800
LATENCY_BUDGET_MS = 1500
MONTHLY_BUDGET_USD = 4000


def chosen_ids():
    plan = mod.MODEL_PLAN
    return [model_id for model_id in [plan["primary"], plan["escalation"], plan["fallback"]] if model_id is not None]


def candidate(model_id):
    if model_id not in CANDIDATES:
        raise AssertionError(f'"{model_id}" is not a pinned model id from the briefing table')
    return CANDIDATES[model_id]


def projected_cost():
    plan = mod.MODEL_PLAN
    primary = candidate(plan["primary"])
    escalation_cost = 0 if plan["escalation"] is None else primary["rejectionRate"] * candidate(plan["escalation"])["costPerThousand"]
    fixed = sum(candidate(model_id)["fixedMonthly"] for model_id in set(chosen_ids()))
    return TICKETS_PER_MONTH_IN_THOUSANDS * (primary["costPerThousand"] + escalation_cost) + fixed


@test('the ADR is an accepted model-layer decision whose context names latency, cost and data residency, with a "We will" decision')
def _():
    adr = mod.ADR
    assert isinstance(adr["id"], int) and adr["id"] > 0
    assert adr["status"] == "accepted"
    assert adr["layer"] == "model"
    assert len(adr["title"].strip()) >= 10
    assert len(adr["context"].strip()) >= 80
    assert re.search(r"latency", adr["context"], re.IGNORECASE)
    assert re.search(r"cost|budget|\$", adr["context"], re.IGNORECASE)
    assert re.search(r"\bEU\b|europe|privacy|personal data", adr["context"], re.IGNORECASE)
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


@test("the plan uses pinned snapshot ids from the briefing table, never a -latest alias, and a mechanical escalation rule")
def _():
    for model_id in chosen_ids():
        assert not re.search(r"latest", model_id, re.IGNORECASE)
        assert model_id in CANDIDATES
    escalation_rule = mod.MODEL_PLAN["escalationRule"]
    assert len(escalation_rule.strip()) >= 20
    assert re.search(r"valid|categor|confiden|schema|pars", escalation_rule, re.IGNORECASE)


@test("every chosen model processes data in the EU and the fallback runs on a different provider than the primary")
def _():
    plan = mod.MODEL_PLAN
    outside_eu = [model_id for model_id in chosen_ids() if not candidate(model_id)["eu"]]
    assert outside_eu == []
    assert candidate(plan["fallback"])["provider"] != candidate(plan["primary"])["provider"]


@test("the latency budget rules out slow tiers and the plan reaches 92% accuracy, with at least 88% on the fallback")
def _():
    plan = mod.MODEL_PLAN
    escalation_latency = 0 if plan["escalation"] is None else candidate(plan["escalation"])["p95Ms"]
    assert candidate(plan["primary"])["p95Ms"] + escalation_latency <= LATENCY_BUDGET_MS
    assert candidate(plan["fallback"])["p95Ms"] <= LATENCY_BUDGET_MS
    escalation_accuracy = 0 if plan["escalation"] is None else candidate(plan["escalation"])["accuracy"]
    best_accuracy = max(candidate(plan["primary"])["accuracy"], escalation_accuracy)
    assert best_accuracy >= 0.92
    assert candidate(plan["fallback"])["accuracy"] >= 0.88


@test("the projected monthly cost matches the plan within 10% and fits the $4 000 budget")
def _():
    expected = projected_cost()
    projected = mod.MODEL_PLAN["projectedMonthlyUsd"]
    assert isinstance(projected, (int, float)) and not isinstance(projected, bool)
    assert abs(projected - expected) <= expected * 0.1
    assert expected <= MONTHLY_BUDGET_USD
    assert projected <= MONTHLY_BUDGET_USD
