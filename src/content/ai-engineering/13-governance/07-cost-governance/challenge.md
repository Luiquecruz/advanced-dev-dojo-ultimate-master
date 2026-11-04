Build a cost governor that sits in front of every model call: budgets per team and feature with alerts and hard limits, rate limits per team, and attribution of the actual spend.

A **budget** is `{ id, team?, feature?, limitUsd }`. A budget matches a call context `{ team, feature }` when each field it sets is equal (a budget with neither field is company-wide). A **rate limit** is `{ requests, windowMs }`. Model usage has the `@dojo/ai` shape `{ inputTokens, outputTokens, totalTokens, cost }`.

## 1. `createCostGovernor({ budgets, alertThresholds = [0.5, 0.8, 1], rateLimits = {}, now, onAlert })`

`rateLimits` maps team names to rate limits; `now()` returns milliseconds. Return `{ check, record, spent, report }`:

- `check(context, estimatedCostUsd)`:
  1. **Hard limit:** for each matching budget, in the order given, if what it has spent plus the estimate exceeds `limitUsd`, return `{ allowed: false, reason: 'hard-limit', budgetId }`.
  2. **Rate limit:** if the team has a limit and it already made `requests` allowed calls in the window (timestamps after `now() - windowMs`), return `{ allowed: false, reason: 'rate-limit', retryAfterMs }`, where `retryAfterMs` is when the oldest call in the window leaves it.
  3. Otherwise record the call's timestamp for the team and return `{ allowed: true }`. Refused attempts are not counted.
- `record(context, model, usage)` adds `usage.cost` to every matching budget, then calls `onAlert({ budgetId, threshold, spentUsd, limitUsd })` for every threshold the budget has now reached (`spent >= threshold * limitUsd`) that has not alerted before, from the lowest threshold up. Each budget alerts at most once per threshold.
- `spent(budgetId)` returns the budget's spend.
- `report()` returns `{ totalUsd, byTeam, byFeature, byModel }`, where `byFeature` keys are `team/feature`.

## 2. `estimateCostUsd(request, pricing, defaultMaxTokens = 1000)`

`pricing` is `{ inputPerMillion, outputPerMillion }`. The estimate is `countTokens(request.messages)` input tokens plus `request.maxTokens` (or `defaultMaxTokens`) output tokens, at those prices: the most the call can cost, known before it runs.

## 3. `governedGenerate(governor, model, context, request, pricing)`

Check the estimate. If refused, throw a `BudgetExceededError` (exported by the starter) carrying the check result, without calling the model. Otherwise call the model, record the **actual** usage under the response's model name, and return the response. A failed call is not charged and its error propagates unchanged.
