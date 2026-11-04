Build a cost governor that sits in front of every model call: budgets per team and feature with alerts and hard limits, rate limits per team, and attribution of the actual spend.

A **budget** is a dict `{"id", "team"?, "feature"?, "limitUsd"}`. A budget matches a call context `{"team", "feature"}` when each key it sets is equal (a budget with neither key is company-wide). A **rate limit** is `{"requests", "windowMs"}`. Model usage has the `dojo_ai` shape `{"inputTokens", "outputTokens", "totalTokens", "cost"}`. Keys keep the JSON names (camelCase); functions and parameters use Python names.

## 1. `create_cost_governor(*, budgets, now, alert_thresholds=(0.5, 0.8, 1), rate_limits=None, on_alert=None)`

`rate_limits` maps team names to rate limits; `now()` returns milliseconds. Return a `CostGovernor` with `check`, `record`, `spent` and `report`:

- `check(context, estimated_cost_usd)`:
  1. **Hard limit:** for each matching budget, in the order given, if what it has spent plus the estimate exceeds `"limitUsd"`, return `{"allowed": False, "reason": "hard-limit", "budgetId": ...}`.
  2. **Rate limit:** if the team has a limit and it already made `"requests"` allowed calls in the window (timestamps after `now() - windowMs`), return `{"allowed": False, "reason": "rate-limit", "retryAfterMs": ...}`, where `"retryAfterMs"` is when the oldest call in the window leaves it.
  3. Otherwise record the call's timestamp for the team and return `{"allowed": True}`. Refused attempts are not counted.
- `record(context, model, usage)` adds `usage["cost"]` to every matching budget, then calls `on_alert({"budgetId", "threshold", "spentUsd", "limitUsd"})` for every threshold the budget has now reached (`spent >= threshold * limitUsd`) that has not alerted before, from the lowest threshold up. Each budget alerts at most once per threshold.
- `spent(budget_id)` returns the budget's spend.
- `report()` returns `{"totalUsd", "byTeam", "byFeature", "byModel"}`, where `"byFeature"` keys are `team/feature`.

## 2. `estimate_cost_usd(request, pricing, default_max_tokens=1000)`

`pricing` is `{"inputPerMillion", "outputPerMillion"}`. The estimate is `count_tokens(request["messages"])` input tokens plus `request["maxTokens"]` (or `default_max_tokens`) output tokens, at those prices: the most the call can cost, known before it runs.

## 3. `await governed_generate(governor, model, context, request, pricing)`

Check the estimate. If refused, raise a `BudgetExceededError` (provided) carrying the check result in `result`, without calling the model. Otherwise call the model, record the **actual** usage under the response's model name (`response["model"]`), and return the response. A failed call is not charged and its error (`ModelError`) propagates unchanged.
