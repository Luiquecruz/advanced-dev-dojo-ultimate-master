Build a traceability matrix for spec-driven development: parse a Markdown spec and task list, link test names to requirements, report what is not covered, and check a model-generated plan with the same matrix.

Ids are `REQ-<digits>` for requirements and `TASK-<digits>` for tasks. `SpecError` and `PLANNER_SYSTEM_PROMPT` are already defined. Requirements, tasks, rows and reports are plain dicts; their keys keep the camelCase names of the JSON contract, functions use Python names.

## 1. `find_references(text)`

Return `{"requirements": [...], "tasks": [...]}`: every requirement id and every task id in the text, unique, in order of first appearance. Ids are whole words: `REQ-12` is not `REQ-1`, and `XREQ-1`, `REQ-1a` or `PRE-TASK-3` are not ids (no ASCII letter, digit, `_` or `-` directly before or after).

## 2. `parse_requirements(markdown)`

Return `{"id": ..., "text": ...}` for every list item whose content starts with a requirement id and a colon (`- REQ-1: text`, also `*` bullets and indented items), in order. `"text"` is the stripped rest of the line. Every other line (headings, prose that mentions an id, other list items) is ignored. A repeated id raises a `SpecError` whose message contains the id.

## 3. `parse_tasks(markdown)`

Return `{"id", "text", "done", "requirements"}` for every checkbox item `- [ ] TASK-1: text` (`*` bullets too). `"done"` is `True` for `[x]` or `[X]`. `"text"` is the stripped rest of the line after the colon, and `"requirements"` is `find_references(text)["requirements"]`. Other lines are ignored; a repeated task id raises a `SpecError` containing the id.

## 4. `build_traceability(*, spec, tasks, tests)`

`spec` is Markdown, `tasks` is Markdown or a list of tasks (as returned by `parse_tasks`), and `tests` is a list of test names. Return a dict:

| Key | Content |
| --- | --- |
| `"rows"` | one `{"requirement", "tasks", "tests", "status"}` per requirement, in spec order. `"tasks"`: ids of the tasks that list the requirement, in task order. `"tests"`: names of the tests that verify it, in input order |
| `"uncoveredRequirements"` | ids of the rows whose status is not `covered` |
| `"orphanTasks"` | ids of tasks that list no requirement of the spec |
| `"testsWithoutRequirement"` | names of tests that verify no requirement of the spec |
| `"unknownReferences"` | `{"from", "id"}` for each reference to an id that does not exist: first every task (`"from"` is the task id) with unknown requirement ids, then every test (`"from"` is the test name) with unknown requirement ids, then its unknown task ids |
| `"coverage"` | covered requirements divided by all requirements, `0` when the spec has none |

A test **verifies** a requirement when its name references the requirement directly, or references a task that lists it. Status: `covered` with at least one test, `untested` with tasks but no test, `unplanned` with neither.

## 5. `plan_tasks(model, spec, *, max_attempts=2)`

Ask the model for a plan and validate it:

1. Messages: `{"role": "system", "content": PLANNER_SYSTEM_PROMPT}` and `{"role": "user", "content": spec}`; request `"responseFormat": {"type": "json"}` and `await model.generate(request)`.
2. A valid reply is JSON `{"tasks": [...]}` with at least one task, each `{"id", "text", "requirements"}`: `"id"` matches `TASK-<digits>`, `"text"` is a non-empty string, `"requirements"` is a list of strings. Return the tasks as `{"id", "text", "done": False, "requirements"}` (stripped text, unique requirements). Unknown requirement ids are kept: the matrix reports them.
3. An invalid reply (not JSON or the wrong shape): when attempts remain, append `{"role": "assistant", "content": <reply text>}` and a `user` message that starts with `Invalid plan` and says what is wrong, then call again with all messages. After `max_attempts` invalid replies, raise a `SpecError`.

The tests script malformed and wrongly shaped plans across seeds; they check messages and results, never the wording of model output.
