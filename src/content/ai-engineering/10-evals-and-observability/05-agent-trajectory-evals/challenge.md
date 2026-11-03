Evaluate how an agent worked, not only what it answered: record its trajectory, check it against a spec of required, forbidden and ordered tool calls plus limits, and aggregate a suite of runs.

The starter already contains `runAgent(model, { task, tools, maxSteps, onEvent })`, the agent loop from The Agent Loop. It calls `onEvent({ type: 'model', response })` after each model response and `onEvent({ type: 'tool', call, result, ok })` after each tool call, where `ok` is `false` when the tool is unknown, its arguments are not a JSON object, or it throws. It returns `{ status, answer }` with status `'done'`, `'refused'` or `'max_steps'`. `parseArguments(raw)` returns the parsed arguments object or `null`.

## 1. `recordTrajectory(model, { task, tools, maxSteps })`

Run `runAgent` and return `{ task, status, answer, steps }`, where `steps` lists, in the order they happened:

- `{ type: 'model', inputTokens, outputTokens, costUsd }` for each model response (from its `usage`; `costUsd` is `usage.cost`);
- `{ type: 'tool', name, arguments, ok }` for each tool call, **including** calls the loop rejected; `arguments` is `parseArguments(call.arguments)`.

## 2. `evaluateTrajectory(trajectory, spec)`

Every field of `spec` is optional: `{ requiredTools, forbiddenTools, order, forbiddenCalls, maxModelCalls, maxToolCalls, maxCostUsd, requireDone = true }`. Step indexes refer to positions in `trajectory.steps`.

Return `{ pass, violations, metrics }`. `metrics` is `{ modelCalls, toolCalls, inputTokens, outputTokens, costUsd }`, summed over the steps. `violations` lists **every** problem as `{ rule, detail, step? }` with a non-empty `detail`:

| `rule` | When | `step` |
| --- | --- | --- |
| `not_done` | `requireDone` and the status is not `'done'` | none |
| `missing_tool` | a required tool has no call with `ok: true` (one violation per tool, `detail` names it) | none |
| `forbidden_tool` | each call to a forbidden tool, successful or not | the call |
| `order` | for each pair `[before, after]`, each call of `after` that happens before the first call of `before` with `ok: true` (or when there is none) | the call of `after` |
| `forbidden_call` | for each `{ tool, description, matches }`, each call of `tool` whose arguments are not `null` and `matches(arguments)` returns `true` | the call |
| `max_model_calls`, `max_tool_calls`, `max_cost` | the metric is strictly above the limit | none |

`pass` is `true` when there are no violations.

## 3. `evaluateSuite(cases)`

`cases` is a list of `{ id, trajectory, spec }`. Return `{ results, passRate, violationsByRule }`: `results` holds `{ id, pass, violations }` per case in order, `passRate` is the share of passing cases, and `violationsByRule` counts every violation by rule (rules that never occur are absent).

The tests script careful, hasty and rogue agents across seeds, unknown tools, broken arguments and failing tools; they check steps, rules, step indexes and counts, never the wording of your details beyond the tool names.
