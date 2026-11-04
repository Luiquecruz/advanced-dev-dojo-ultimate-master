Write one `matches(budget, context)` helper: `budget.get("team") in (None, context["team"]) and budget.get("feature") in (None, context["feature"])`. Keep spend in a dict from budget id to dollars.
---
For the rate limit, keep a list of allowed timestamps per team. In `check`, filter it to `timestamp > now - window_ms`; if its length reached `"requests"`, refuse with `recent[0] + window_ms - now`; otherwise append `now` and allow. Do the hard-limit loop before the rate limit, so a call that will be refused anyway does not use a slot.
---
For alerts, sort the thresholds once and keep a set of `(budget_id, threshold)` pairs that already fired. After adding the cost, loop over the thresholds and fire each one with `after >= threshold * limit_usd` that is not in the set yet.
---
`estimate_cost_usd` is `(count_tokens(messages) * input_per_million + request.get("maxTokens", default_max_tokens) * output_per_million) / 1_000_000`. In `governed_generate`, raise before `generate` when the check refuses, and call `governor.record(context, response["model"], response["usage"])` only after the call succeeded.
