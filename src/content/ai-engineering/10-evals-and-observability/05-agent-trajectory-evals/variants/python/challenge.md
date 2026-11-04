Evaluate how an agent worked, not only what it answered: record its trajectory, check it against a spec of required, forbidden and ordered tool calls plus limits, and aggregate a suite of runs.

A tool is a dict `{"name", "description", "parameters", "execute"}`, where `"execute"` is a function (sync or `async`) that receives the arguments dict. The starter already contains `run_agent(model, task=..., tools=..., max_steps=..., on_event=None)`, the agent loop from The Agent Loop. It calls `on_event({"type": "model", "response": response})` after each model response and `on_event({"type": "tool", "call": call, "result": result, "ok": ok})` after each tool call, where `"ok"` is `False` when the tool is unknown, its arguments are not a JSON object, or it raises. It returns `{"status", "answer"}` with status `"done"`, `"refused"` or `"max_steps"`. `parse_arguments(raw)` returns the parsed arguments dict or `None`. Steps, specs and reports are dicts with camelCase keys.

## 1. `record_trajectory(model, task=..., tools=..., max_steps=...)`

Keyword-only arguments after `model`. Run `run_agent` and return `{"task", "status", "answer", "steps"}`, where `"steps"` lists, in the order they happened:

- `{"type": "model", "inputTokens", "outputTokens", "costUsd"}` for each model response (from its `"usage"`; `"costUsd"` is `usage["cost"]`);
- `{"type": "tool", "name", "arguments", "ok"}` for each tool call, **including** calls the loop rejected; `"arguments"` is `parse_arguments(call["arguments"])`.

## 2. `evaluate_trajectory(trajectory, spec)`

Every key of `spec` is optional: `{"requiredTools", "forbiddenTools", "order", "forbiddenCalls", "maxModelCalls", "maxToolCalls", "maxCostUsd", "requireDone"}` (`"requireDone"` defaults to `True`). Step indexes refer to positions in `trajectory["steps"]`.

Return `{"pass", "violations", "metrics"}`. `"metrics"` is `{"modelCalls", "toolCalls", "inputTokens", "outputTokens", "costUsd"}`, summed over the steps. `"violations"` lists **every** problem as `{"rule", "detail", "step"}` with a non-empty `"detail"`; the `"step"` key is present only for the rules that name one:

| `"rule"` | When | `"step"` |
| --- | --- | --- |
| `not_done` | `requireDone` and the status is not `"done"` | none |
| `missing_tool` | a required tool has no call with `"ok": True` (one violation per tool, `"detail"` names it) | none |
| `forbidden_tool` | each call to a forbidden tool, successful or not | the call |
| `order` | for each pair `[before, after]`, each call of `after` that happens before the first call of `before` with `"ok": True` (or when there is none) | the call of `after` |
| `forbidden_call` | for each `{"tool", "description", "matches"}`, each call of `tool` whose arguments are not `None` and `matches(arguments)` returns `True` | the call |
| `max_model_calls`, `max_tool_calls`, `max_cost` | the metric is strictly above the limit | none |

`"pass"` is `True` when there are no violations.

## 3. `evaluate_suite(cases)`

`cases` is a list of `{"id", "trajectory", "spec"}`. Return `{"results", "passRate", "violationsByRule"}`: `"results"` holds `{"id", "pass", "violations"}` per case in order, `"passRate"` is the share of passing cases, and `"violationsByRule"` counts every violation by rule (rules that never occur are absent).

The tests script careful, hasty and rogue agents across seeds, unknown tools, broken arguments and failing tools; they check steps, rules, step indexes and counts, never the wording of your details beyond the tool names.
