Build a model registry that decides which model version answers in production: approved licenses, pinned versions, promotion gated by eval results, deprecation warnings and rollback. Then route model calls through it.

A **model version** is `{ id, provider, license, retiresAt?, replacement? }`, where `id` names one exact, dated version and `retiresAt` is an ISO date. A **gate** is `{ minimums, maxRegression }`: `minimums` maps eval suite names to the minimum score.

## 1. `createModelRegistry({ now, allowedLicenses, warnWithinDays = 30 })`

`now()` returns milliseconds. Return `{ register, recordEval, promote, resolve, rollback, history }`:

- `register(version)` throws for a duplicate id, an id ending in `latest` (a floating alias, not a pinned version) and a license not in `allowedLicenses`.
- `recordEval(versionId, suite, score)` records (or replaces) a score; it throws for an unknown version.
- `promote(alias, versionId, gate)` pins the alias to the version when the gate passes and returns `{ promoted: true, alias, versionId, previous? }` (`previous` is the version the alias pointed to, when there was one). Otherwise it returns `{ promoted: false, reasons }` and changes nothing. Reasons:
  - an unknown version gives only `['unknown-version']`;
  - `'retired'` when `retiresAt` is at or before `now()`;
  - then, for each suite of `minimums` in order: `missing-eval:<suite>` with no score, otherwise `below-minimum:<suite>` under the minimum and `regression:<suite>` when the currently pinned version has a score for that suite and the candidate scores more than `maxRegression` below it.
- `resolve(alias)` returns `{ versionId, warnings }`. It throws for an unknown alias and when the pinned version has retired. When it retires within `warnWithinDays`, `warnings` has one message that contains the number of days left (`<n> days`, rounded up) and the replacement's id.
- `rollback(alias)` re-pins the version that was pinned before the current one and returns its id; it throws when there is none.
- `history(alias)` lists every version the alias was pinned to, in order, including rollbacks.

## 2. `generateWithAlias(registry, alias, request, onWarning?)`

Resolve the alias, pass each warning to `onWarning`, and call `createModel({ model: versionId }).generate(request)`. The tests script replies per model name with `fakeModel.forModel`, so the call must reach exactly the pinned version.
