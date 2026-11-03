Build a versioned prompt registry: templates with named variables, immutable versions, strict rendering, tests per prompt, promotion gated by those tests, an active version per environment and rollback.

A **prompt definition** is `{ name, version, template: { system, user }, tests }`. Placeholders look like `{{name}}` or `{{ name }}` (letters, digits and `_`, not starting with a digit). A **test** is `{ name, variables, check(output) }`. Rendering produces two messages: a system message from `template.system` and a user message from `template.user`.

## 1. `templateVariables(template)`

The names of all placeholders in `system`, then `user`, without duplicates, in order of first appearance.

## 2. `createPromptRegistry()`

Returns an object with these operations. Errors: `PromptRegistryError` for registry problems, `PromptRenderError` with `missing` and `unexpected` (lists of variable names) for rendering problems, `PromotionBlockedError` with `failedTests` (list of test names) for a blocked promotion.

- **`register(definition)`**: stores the version. Registering a `name` and `version` that already exist fails with `PromptRegistryError`: versions are immutable. Registering never activates a version.
- **`versions(name)`**: the registered versions in registration order (`[]` for an unknown name).
- **`renderVersion(name, version, variables)`**: renders that exact version (unknown name or version: `PromptRegistryError`). If any template variable is missing from `variables`, or `variables` has a key the template does not use, fail with `PromptRenderError` listing **all** missing and unexpected names. Replace placeholders in a single pass: a value containing `{{...}}` stays literal. Returns `{ name, version, messages }`.
- **`activeVersion(name, environment)`**: the active version, or `undefined`.
- **`render(name, variables, environment = 'production')`**: renders the active version of that environment; fails with `PromptRegistryError` when there is none.
- **`runTests(name, version, model)`**: for each test of that version, in order, call `model.generate({ messages })` with the messages rendered from the test's `variables`. The test passes when the finish reason is `stop` and `check(text)` returns `true`; any other outcome, including an error thrown by the model, fails it. Returns `{ passed, failed }` (test names).
- **`promote(name, version, environment, model)`**: fails with `PromotionBlockedError` (`failedTests: []`) when the version has no tests, without calling the model. Otherwise runs the tests; when any fails, fails with `PromotionBlockedError` listing them and leaves the environment unchanged. When all pass, the version becomes active in that environment.
- **`rollback(name, environment)`**: makes the version that was active before the current one active again and returns it. Each environment keeps its own history; repeated rollbacks walk further back. With no earlier version, fail with `PromptRegistryError`.

The tests script model replies across seeds for the prompt tests and check rendering, gates, environments and rollback, never wording.
