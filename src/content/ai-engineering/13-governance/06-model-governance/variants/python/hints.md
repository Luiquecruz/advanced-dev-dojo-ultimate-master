Keep four dicts: versions by id, scores by version (a dict of suite to score), a pin stack (a list) per alias, and a history list per alias. `register` validates in order: duplicate, `version["id"].lower().endswith("latest")`, license allowlist.
---
In `promote`, return `["unknown-version"]` early. Otherwise append `"retired"` if needed, then loop over `gate["minimums"].items()`: no score gives `missing-eval:<suite>` and `continue`; a low score gives `below-minimum:<suite>`; and when the current pin (the top of the alias stack) has a score for the suite, `score < baseline - gate["maxRegression"]` gives `regression:<suite>`.
---
Only when there are no reasons, push the version on the stack and append it to the history. `rollback` pops the top, requires something left underneath, and appends the restored version to the history.
---
`resolve` reads the top of the stack, raises when `parse_time_ms(retires_at) <= now()`, and warns when `retires_at - now()` is within `warn_within_days * DAY_MS`, with `math.ceil` for the days. `generate_with_alias` is three steps: resolve, pass each warning to `on_warning`, `await create_model(version_id).generate(request)`.
