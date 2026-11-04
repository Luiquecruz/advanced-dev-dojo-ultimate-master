Write one `matches(budget, context)` helper: `(budget.team === undefined || budget.team === context.team) && (budget.feature === undefined || budget.feature === context.feature)`. Keep spend in a `Map` from budget id to dollars.
---
For the rate limit, keep a list of allowed timestamps per team. In `check`, filter it to `timestamp > now - windowMs`; if its length reached `requests`, refuse with `recent[0] + windowMs - now`; otherwise push `now` and allow. Do the hard-limit loop before the rate limit, so a call that will be refused anyway does not use a slot.
---
For alerts, sort the thresholds once and keep a `Set` of `budgetId:threshold` keys that already fired. After adding the cost, loop over the thresholds and fire each one with `after >= threshold * limitUsd` that is not in the set yet.
---
`estimateCostUsd` is `(countTokens(messages) * inputPerMillion + (maxTokens ?? defaultMaxTokens) * outputPerMillion) / 1_000_000`. In `governedGenerate`, throw before `generate` when the check refuses, and call `record(context, response.model, response.usage)` only after the call succeeded.
