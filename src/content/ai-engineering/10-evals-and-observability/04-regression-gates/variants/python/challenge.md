Build the regression gate that decides whether a candidate prompt or model may replace the baseline: repeated runs per case, a per-case diff, and blocking rules for the aggregate and for critical cases.

A case is a dict `{"id", "input", "expected", "critical"}` (`"critical"` is optional). A variant is a dict `{"name", "model", "prompt"}`, where `"model"` has `await generate(request)` and `"prompt"` is a function that builds the request for a case. Results are dicts with camelCase keys (`"passRate"`, `"baselinePassRate"`).

## 1. `evaluate_variant(variant, dataset=..., score=..., repeats=3)`

Keyword-only arguments after `variant`. For each case **in dataset order**, call `await variant["model"].generate(variant["prompt"](eval_case))` `repeats` times in a row. A run passes when `score(response["text"], eval_case)` returns `True`; a model error is a failed run, counted in `"errors"`, and never stops the evaluation.

Return `{"variant", "repeats", "cases", "passRate", "flaky"}`:

- `"variant"`: the variant's `"name"`;
- `"cases"`: one `{"id", "critical", "runs", "passes", "errors", "passRate"}` per case, where `"critical"` is `True` only when the case says so and `"passRate"` is `passes / runs`;
- `"passRate"`: all passes divided by all runs;
- `"flaky"`: the ids of cases whose pass rate is strictly between 0 and 1, in dataset order.

## 2. `compare_runs(baseline, candidate, tolerance=0.02, case_tolerance=0.34)`

Compare two results of `evaluate_variant` (`tolerance` and `case_tolerance` are keyword-only). Return `{"decision", "baselinePassRate", "candidatePassRate", "delta", "regressions", "improvements", "reasons"}`:

- `"delta"` is `candidate["passRate"] - baseline["passRate"]`.
- For every case present in both runs, a diff `{"id", "critical", "baseline", "candidate", "delta"}` holds both pass rates and their difference (`"critical"` when either run marks it). `"regressions"` are the diffs with `delta < -case_tolerance`; `"improvements"` are the diffs with `delta > case_tolerance`; both in baseline order.
- `"reasons"` collects one non-empty string per blocking problem:
  1. the runs have different case ids (name the missing and the added ids);
  2. `delta < -tolerance` (the aggregate dropped beyond the tolerance);
  3. one reason per critical case in `"regressions"`, naming the case id.
- `"decision"` is `"block"` when there is at least one reason, `"pass"` otherwise.

Compare with a small epsilon (`1e-9`) so that a drop of exactly `tolerance` or `case_tolerance` passes despite floating-point rounding.

The tests script flaky answers, rate limits and seeded candidates that only sometimes break the critical case; they check counts, diffs and decisions, never the wording of your reasons beyond the case ids.
