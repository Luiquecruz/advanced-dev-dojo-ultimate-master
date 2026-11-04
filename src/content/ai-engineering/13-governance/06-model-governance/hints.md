Keep four maps: versions by id, scores by version (a `Map` of suite to score), a pin stack per alias, and a history list per alias. `register` validates in order: duplicate, `/latest$/i.test(id)`, license allowlist.
---
In `promote`, return `['unknown-version']` early. Otherwise push `'retired'` if needed, then loop over `Object.entries(gate.minimums)`: no score gives `missing-eval:<suite>` and `continue`; a low score gives `below-minimum:<suite>`; and when the current pin (the top of the alias stack) has a score for the suite, `score < baseline - maxRegression` gives `regression:<suite>`.
---
Only when there are no reasons, push the version on the stack and append it to the history. `rollback` pops the top, requires something left underneath, and appends the restored version to the history.
---
`resolve` reads the top of the stack, throws when `Date.parse(retiresAt) <= now()`, and warns when `retiresAt - now()` is within `warnWithinDays * DAY`, with `Math.ceil` for the days. `generateWithAlias` is three lines: resolve, `warnings.forEach(onWarning)`, `createModel({ model: versionId }).generate(request)`.
