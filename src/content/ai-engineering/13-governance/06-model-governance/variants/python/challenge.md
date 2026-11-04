Build a model registry that decides which model version answers in production: approved licenses, pinned versions, promotion gated by eval results, deprecation warnings and rollback. Then route model calls through it.

A **model version** is a dict `{"id", "provider", "license", "retiresAt"?, "replacement"?}`, where `"id"` names one exact, dated version and `"retiresAt"` is an ISO date. A **gate** is `{"minimums", "maxRegression"}`: `"minimums"` maps eval suite names to the minimum score. Keys keep the JSON names (camelCase); functions and parameters use Python names. `parse_time_ms(text)` is provided.

## 1. `create_model_registry(*, now, allowed_licenses, warn_within_days=30)`

`now()` returns milliseconds. Return a `ModelRegistry` with `register`, `record_eval`, `promote`, `resolve`, `rollback` and `history`:

- `register(version)` raises for a duplicate id, an id ending in `latest` in any case (a floating alias, not a pinned version) and a license not in `allowed_licenses`.
- `record_eval(version_id, suite, score)` records (or replaces) a score; it raises for an unknown version.
- `promote(alias, version_id, gate)` pins the alias to the version when the gate passes and returns `{"promoted": True, "alias", "versionId", "previous"?}` (`"previous"` is the version the alias pointed to, only when there was one). Otherwise it returns `{"promoted": False, "reasons": reasons}` and changes nothing. Reasons:
  - an unknown version gives only `["unknown-version"]`;
  - `"retired"` when `"retiresAt"` is at or before `now()`;
  - then, for each suite of `"minimums"` in order: `missing-eval:<suite>` with no score, otherwise `below-minimum:<suite>` under the minimum and `regression:<suite>` when the currently pinned version has a score for that suite and the candidate scores more than `"maxRegression"` below it.
- `resolve(alias)` returns `{"versionId", "warnings"}`. It raises for an unknown alias and when the pinned version has retired. When it retires within `warn_within_days`, `"warnings"` has one message that contains the number of days left (`<n> days`, rounded up) and the replacement's id.
- `rollback(alias)` re-pins the version that was pinned before the current one and returns its id; it raises when there is none.
- `history(alias)` lists every version the alias was pinned to, in order, including rollbacks.

## 2. `await generate_with_alias(registry, alias, request, on_warning=None)`

Resolve the alias, pass each warning to `on_warning` (when given), and return `await create_model(version_id).generate(request)`. The tests script replies per model name with `fake_model.for_model`, so the call must reach exactly the pinned version.
