Build a versioned prompt registry: templates with named variables, immutable versions, strict rendering, tests per prompt, promotion gated by those tests, an active version per environment and rollback.

A **prompt definition** is a dict `{"name", "version", "template": {"system", "user"}, "tests"}`. Placeholders look like `{{name}}` or `{{ name }}` (letters, digits and `_`, not starting with a digit). A **test** is a dict `{"name", "variables", "check"}`, where `check(output)` is a function returning `True` for an acceptable reply. Rendering produces two message dicts: a system message from `template["system"]` and a user message from `template["user"]`.

## 1. `template_variables(template)`

The names of all placeholders in `"system"`, then `"user"`, without duplicates, in order of first appearance.

## 2. `PromptRegistry` (returned by `create_prompt_registry()`)

Exceptions: `PromptRegistryError` for registry problems, `PromptRenderError` with `missing` and `unexpected` (lists of variable names) for rendering problems, `PromotionBlockedError` with `failed_tests` (list of test names) for a blocked promotion. They are already written.

- **`register(definition)`**: stores the version. Registering a `name` and `version` that already exist raises `PromptRegistryError`: versions are immutable. Registering never activates a version.
- **`versions(name)`**: the registered versions in registration order (`[]` for an unknown name).
- **`render_version(name, version, variables)`**: renders that exact version (unknown name or version: `PromptRegistryError`). If any template variable is missing from `variables`, or `variables` has a key the template does not use, raise `PromptRenderError` listing **all** missing and unexpected names. Replace placeholders in a single pass: a value containing `{{...}}` stays literal. Returns `{"name": ..., "version": ..., "messages": [...]}`.
- **`active_version(name, environment)`**: the active version, or `None`.
- **`render(name, variables, environment="production")`**: renders the active version of that environment; raises `PromptRegistryError` when there is none.
- **`await run_tests(name, version, model)`**: for each test of that version, in order, await `model.generate({"messages": ...})` with the messages rendered from the test's `"variables"`. The test passes when the finish reason is `stop` and `check(text)` returns `True`; any other outcome, including an exception raised by the model, fails it. Returns `{"passed": [...], "failed": [...]}` (test names).
- **`await promote(name, version, environment, model)`**: raises `PromotionBlockedError` (`failed_tests=[]`) when the version has no tests, without calling the model. Otherwise runs the tests; when any fails, raises `PromotionBlockedError` listing them and leaves the environment unchanged. When all pass, the version becomes active in that environment.
- **`rollback(name, environment)`**: makes the version that was active before the current one active again and returns it. Each environment keeps its own history; repeated rollbacks walk further back. With no earlier version, raise `PromptRegistryError`.

The tests script model replies across seeds for the prompt tests and check rendering, gates, environments and rollback, never wording.
