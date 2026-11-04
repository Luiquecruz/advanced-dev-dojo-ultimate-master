from dojo_ai import count_tokens


class BudgetExceededError(Exception):
    """Raised before a model call that a budget or rate limit refuses; `result` is the refused check."""

    def __init__(self, result):
        if result["reason"] == "hard-limit":
            message = f"Budget {result['budgetId']} would be exceeded"
        else:
            message = f"Rate limit reached; retry in {result['retryAfterMs']} ms"
        super().__init__(message)
        self.result = result


def matches(budget, context):
    return budget.get("team") in (None, context["team"]) and budget.get("feature") in (None, context["feature"])


def add(totals, key, amount):
    totals[key] = totals.get(key, 0) + amount


class CostGovernor:
    """Enforces budgets and rate limits before model calls and attributes the actual spend after them."""

    def __init__(self, budgets, alert_thresholds, rate_limits, now, on_alert):
        self._budgets = budgets
        self._thresholds = sorted(alert_thresholds)
        self._rate_limits = rate_limits
        self._now = now
        self._on_alert = on_alert
        self._spent = {budget["id"]: 0 for budget in budgets}
        self._fired_alerts = set()
        self._calls_by_team = {}
        self._report = {"totalUsd": 0, "byTeam": {}, "byFeature": {}, "byModel": {}}

    def _matching(self, context):
        return [budget for budget in self._budgets if matches(budget, context)]

    def check(self, context, estimated_cost_usd):
        for budget in self._matching(context):
            if self._spent[budget["id"]] + estimated_cost_usd > budget["limitUsd"]:
                return {"allowed": False, "reason": "hard-limit", "budgetId": budget["id"]}
        limit = self._rate_limits.get(context["team"])
        if limit is not None:
            current = self._now()
            recent = [timestamp for timestamp in self._calls_by_team.get(context["team"], []) if timestamp > current - limit["windowMs"]]
            if len(recent) >= limit["requests"]:
                self._calls_by_team[context["team"]] = recent
                return {"allowed": False, "reason": "rate-limit", "retryAfterMs": recent[0] + limit["windowMs"] - current}
            self._calls_by_team[context["team"]] = [*recent, current]
        return {"allowed": True}

    def record(self, context, model, usage):
        cost = usage["cost"]
        for budget in self._matching(context):
            after = self._spent[budget["id"]] + cost
            self._spent[budget["id"]] = after
            for threshold in self._thresholds:
                key = (budget["id"], threshold)
                if key not in self._fired_alerts and after >= threshold * budget["limitUsd"]:
                    self._fired_alerts.add(key)
                    if self._on_alert is not None:
                        self._on_alert({"budgetId": budget["id"], "threshold": threshold, "spentUsd": after, "limitUsd": budget["limitUsd"]})
        self._report["totalUsd"] += cost
        add(self._report["byTeam"], context["team"], cost)
        add(self._report["byFeature"], f"{context['team']}/{context['feature']}", cost)
        add(self._report["byModel"], model, cost)

    def spent(self, budget_id):
        return self._spent.get(budget_id, 0)

    def report(self):
        return {
            "totalUsd": self._report["totalUsd"],
            "byTeam": dict(self._report["byTeam"]),
            "byFeature": dict(self._report["byFeature"]),
            "byModel": dict(self._report["byModel"]),
        }


def create_cost_governor(*, budgets, now, alert_thresholds=(0.5, 0.8, 1), rate_limits=None, on_alert=None):
    return CostGovernor(budgets, alert_thresholds, rate_limits or {}, now, on_alert)


def estimate_cost_usd(request, pricing, default_max_tokens=1000):
    input_tokens = count_tokens(request["messages"])
    output_tokens = request.get("maxTokens", default_max_tokens)
    return (input_tokens * pricing["inputPerMillion"] + output_tokens * pricing["outputPerMillion"]) / 1_000_000


async def governed_generate(governor, model, context, request, pricing):
    result = governor.check(context, estimate_cost_usd(request, pricing))
    if not result["allowed"]:
        raise BudgetExceededError(result)
    response = await model.generate(request)
    governor.record(context, response["model"], response["usage"])
    return response
