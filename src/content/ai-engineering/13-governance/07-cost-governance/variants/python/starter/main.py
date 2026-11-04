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


class CostGovernor:
    """Enforces budgets and rate limits before model calls and attributes the actual spend after them."""

    def __init__(self, budgets, alert_thresholds, rate_limits, now, on_alert):
        self._budgets = budgets
        self._alert_thresholds = alert_thresholds
        self._rate_limits = rate_limits
        self._now = now
        self._on_alert = on_alert
        self._total = 0

    def check(self, context, estimated_cost_usd):
        # TODO: hard limit per matching budget (in order), then a sliding-window rate limit per team; refused attempts are not counted
        return {"allowed": True}

    def record(self, context, model, usage):
        # TODO: charge every matching budget, alert once per budget and threshold, attribute cost by team, feature and model
        self._total += usage["cost"]

    def spent(self, budget_id):
        # TODO: the spend of one budget
        return self._total

    def report(self):
        # TODO: totals by team, by "team/feature" and by model
        return {"totalUsd": self._total, "byTeam": {}, "byFeature": {}, "byModel": {}}


def create_cost_governor(*, budgets, now, alert_thresholds=(0.5, 0.8, 1), rate_limits=None, on_alert=None):
    return CostGovernor(budgets, alert_thresholds, rate_limits or {}, now, on_alert)


def estimate_cost_usd(request, pricing, default_max_tokens=1000):
    # TODO: count_tokens(messages) at the input price plus "maxTokens" (or default_max_tokens) at the output price
    raise NotImplementedError


async def governed_generate(governor, model, context, request, pricing):
    # TODO: check the estimate first and raise BudgetExceededError without calling the model; record the actual usage after a successful call
    response = await model.generate(request)
    governor.record(context, response["model"], response["usage"])
    return response
