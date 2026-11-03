One global regular expression does most of the work: `/\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g`. `templateVariables` collects `match[1]` from `matchAll` on both templates into a `Set`. Rendering with `text.replace(PLACEHOLDER, (_, name) => variables[name])` is single-pass by construction.
---
Store versions in a `Map<name, Map<version, definition>>` (a `Map` keeps insertion order for `versions`). For activations, keep a history array per `name@environment`: the active version is the last element, promotion pushes, rollback pops when at least two entries remain.
---
`runTests` loops over the tests with `try`/`catch` around the model call, pushing each name into `passed` or `failed`. `promote` checks `tests.length === 0` first, then awaits `runTests` and throws `PromotionBlockedError(report.failed, ...)` when `report.failed.length > 0` before touching the history.
