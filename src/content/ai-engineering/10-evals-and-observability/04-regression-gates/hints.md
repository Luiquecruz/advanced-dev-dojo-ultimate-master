`evaluateVariant` is two nested loops: cases outside, `repeats` runs inside. Put one run in a helper that returns `'pass'`, `'fail'` or `'error'` (the `try`/`catch` lives there), then count passes and errors per case. The aggregate pass rate is the sum of passes over the sum of runs, and `flaky` is a filter on `0 < passRate < 1`.
---
In `compareRuns`, index the candidate cases by id with a `Map`. Missing ids are baseline ids not in the map; added ids are candidate ids not in the baseline. Build the diffs with `flatMap` over the baseline cases, skipping ids the candidate does not have, then filter regressions with `diff.delta < -caseTolerance - 1e-9` and improvements with `diff.delta > caseTolerance + 1e-9`.
---
Collect `reasons` in order: a dataset mismatch, then `delta < -tolerance - 1e-9`, then one reason per regression whose `critical` is `true`. The decision is simply `reasons.length > 0 ? 'block' : 'pass'`, so every block explains itself.
