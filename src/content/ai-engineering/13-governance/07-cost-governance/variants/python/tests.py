from dojo_ai import count_tokens, create_model

BUDGETS = [
    {"id": "company", "limitUsd": 100},
    {"id": "support-team", "team": "support", "limitUsd": 10},
    {"id": "support-summaries", "team": "support", "feature": "summaries", "limitUsd": 2},
    {"id": "sales-team", "team": "sales", "limitUsd": 5},
]
PRICING = {"inputPerMillion": 3, "outputPerMillion": 15}


def usage(cost):
    return {"inputTokens": 100, "outputTokens": 50, "totalTokens": 150, "cost": cost}


def support(feature="replies"):
    return {"team": "support", "feature": feature}


class Clock:
    """A settable clock in milliseconds."""

    def __init__(self):
        self.current = 1_000_000

    def __call__(self):
        return self.current

    def advance(self, milliseconds):
        self.current += milliseconds


def governor(**options):
    alerts = []
    clock = Clock()
    created = mod.create_cost_governor(**{"budgets": BUDGETS, "now": clock, "on_alert": alerts.append, **options})
    return created, alerts, clock


def thresholds(alerts):
    return [[alert["budgetId"], alert["threshold"]] for alert in alerts]


@test("record charges every matching budget and attributes cost by team, feature and model")
def _():
    costs, _alerts, _clock = governor()
    costs.record(support("replies"), "acme-small-2026-05", usage(0.4))
    costs.record(support("summaries"), "acme-large-2026-05", usage(0.25))
    costs.record({"team": "sales", "feature": "emails"}, "acme-small-2026-05", usage(0.1))
    assert costs.spent("company") == approx(0.75, abs=0.005)
    assert costs.spent("support-team") == approx(0.65, abs=0.005)
    assert costs.spent("support-summaries") == approx(0.25, abs=0.005)
    assert costs.spent("sales-team") == approx(0.1, abs=0.005)
    report = costs.report()
    assert report["totalUsd"] == approx(0.75, abs=0.005)
    assert sorted(report["byTeam"]) == ["sales", "support"]
    assert report["byTeam"]["support"] == approx(0.65, abs=0.005)
    assert report["byFeature"]["support/summaries"] == approx(0.25, abs=0.005)
    assert report["byFeature"]["sales/emails"] == approx(0.1, abs=0.005)
    assert report["byModel"]["acme-small-2026-05"] == approx(0.5, abs=0.005)
    assert report["byModel"]["acme-large-2026-05"] == approx(0.25, abs=0.005)


@test("alerts fire once per budget and threshold, including several thresholds crossed by one call")
def _():
    costs, alerts, _clock = governor()
    costs.record(support("summaries"), "m", usage(0.9))
    assert alerts == []
    costs.record(support("summaries"), "m", usage(0.2))
    assert thresholds(alerts) == [["support-summaries", 0.5]]
    assert alerts[0]["spentUsd"] == approx(1.1, abs=0.005)
    assert alerts[0]["limitUsd"] == 2
    costs.record(support("summaries"), "m", usage(1.0))
    assert thresholds(alerts) == [["support-summaries", 0.5], ["support-summaries", 0.8], ["support-summaries", 1]]
    costs.record(support("summaries"), "m", usage(0.1))
    assert len(alerts) == 3
    custom, custom_alerts, _custom_clock = governor(alert_thresholds=[0.9, 0.25])
    custom.record({"team": "sales", "feature": "emails"}, "m", usage(5))
    assert thresholds(custom_alerts) == [["sales-team", 0.25], ["sales-team", 0.9]]


@test("check enforces hard limits before the call: the narrowest exhausted budget blocks only its own scope")
def _():
    costs, _alerts, _clock = governor()
    costs.record(support("summaries"), "m", usage(1.8))
    assert costs.check(support("summaries"), 0.1) == {"allowed": True}
    assert costs.check(support("summaries"), 0.3) == {"allowed": False, "reason": "hard-limit", "budgetId": "support-summaries"}
    assert costs.check(support("replies"), 0.3) == {"allowed": True}
    assert costs.check({"team": "sales", "feature": "emails"}, 6) == {"allowed": False, "reason": "hard-limit", "budgetId": "sales-team"}
    assert costs.check({"team": "marketing", "feature": "ads"}, 150) == {"allowed": False, "reason": "hard-limit", "budgetId": "company"}


@test("rate limits use a sliding window per team, report retryAfterMs and do not count refused attempts")
def _():
    costs, _alerts, clock = governor(rate_limits={"support": {"requests": 2, "windowMs": 1000}})
    assert costs.check(support(), 0) == {"allowed": True}
    clock.advance(300)
    assert costs.check(support(), 0) == {"allowed": True}
    clock.advance(200)
    assert costs.check(support(), 0) == {"allowed": False, "reason": "rate-limit", "retryAfterMs": 500}
    assert costs.check({"team": "sales", "feature": "emails"}, 0) == {"allowed": True}
    clock.advance(500)
    assert costs.check(support(), 0) == {"allowed": True}
    assert costs.check(support(), 0) == {"allowed": False, "reason": "rate-limit", "retryAfterMs": 300}
    clock.advance(300)
    assert costs.check(support(), 0) == {"allowed": True}


@test("estimate_cost_usd prices the input tokens and the maximum output")
def _():
    request = {"messages": [{"role": "system", "content": "Summarize the ticket."}, {"role": "user", "content": "The package arrived damaged and the customer wants a refund."}], "maxTokens": 200}
    input_tokens = count_tokens(request["messages"])
    assert mod.estimate_cost_usd(request, PRICING) == approx((input_tokens * 3 + 200 * 15) / 1_000_000, abs=5e-11)
    assert mod.estimate_cost_usd({"messages": request["messages"]}, PRICING) == approx((input_tokens * 3 + 1000 * 15) / 1_000_000, abs=5e-11)
    assert mod.estimate_cost_usd({"messages": request["messages"]}, PRICING, 50) == approx((input_tokens * 3 + 50 * 15) / 1_000_000, abs=5e-11)


@test("governed_generate records the actual cost of each reply and refuses before calling when the estimate would break a budget")
async def _():
    async def scenario():
        fake_model.configure(pricing=PRICING)
        costs, _alerts, _clock = governor(budgets=[{"id": "support-summaries", "team": "support", "feature": "summaries", "limitUsd": 0.01}])
        model = create_model("acme-small-2026-05")
        request = {"messages": [{"role": "user", "content": "Summarize ticket T-1: package arrived damaged."}], "maxTokens": 100}
        fake_model.reply(respond.text(["Damaged package; refund requested.", "Customer reports a damaged package and asks for a refund or a replacement within the week."]), respond.text("Second summary."))
        first = await mod.governed_generate(costs, model, support("summaries"), request, PRICING)
        second = await mod.governed_generate(costs, model, support("summaries"), request, PRICING)
        assert costs.spent("support-summaries") == approx(first["usage"]["cost"] + second["usage"]["cost"], abs=5e-11)
        assert costs.report()["byModel"]["acme-small-2026-05"] == approx(first["usage"]["cost"] + second["usage"]["cost"], abs=5e-11)
        error = await capture_error(mod.governed_generate(costs, model, support("summaries"), {**request, "maxTokens": 1000}, PRICING))
        assert isinstance(error, mod.BudgetExceededError)
        assert error.result == {"allowed": False, "reason": "hard-limit", "budgetId": "support-summaries"}
        assert len(fake_model.requests) == 2

    await for_each_seed(8, scenario)


@test("a failed model call propagates and is not charged")
async def _():
    costs, _alerts, _clock = governor()
    fake_model.reply(respond.error(500))
    error = await capture_error(mod.governed_generate(costs, create_model(), support(), {"messages": [{"role": "user", "content": "hi"}]}, PRICING))
    assert error.status == 500
    assert costs.spent("company") == 0
    assert costs.report()["totalUsd"] == 0
