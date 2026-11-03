Build a research orchestrator: a planner splits a question into subtasks, workers research them in parallel under a concurrency limit, and a synthesizer combines the findings. Malformed plans, failed workers and costs are part of the contract.

The starter exports the three system prompts (`PLANNER_SYSTEM`, `WORKER_SYSTEM`, `SYNTHESIZER_SYSTEM`) and the types. A subtask is `{ id, instruction }`.

## 1. `parsePlan(text, maxSubtasks)`

Return the subtasks of a plan, or `null` when the text is unusable.

- The plan is a JSON object `{ "subtasks": [{ "id": "...", "instruction": "..." }] }`. It may be surrounded by prose or a code fence: parse the text from the first `{` to the last `}`.
- Unusable (return `null`): no object, text that does not parse, `subtasks` missing, not an array or empty, any subtask whose `id` or `instruction` is not a non-blank string, or two subtasks with the same `id`.
- Return the subtasks as `{ id, instruction }`, keeping only the first `maxSubtasks`.

## 2. `runWithConcurrency(items, limit, run)`

Call `run(item, index)` for every item with at most `limit` calls in flight at any time, starting a new one as soon as one finishes. Resolve to the results **in input order**. An empty list resolves to `[]`.

## 3. `orchestrate(question, { model, maxSubtasks, concurrency, maxPlanAttempts })`

1. **Plan.** Call `model.generate` with `responseFormat: { type: 'json' }` and two messages: `{ role: 'system', content: PLANNER_SYSTEM }` and a `user` message containing `question` and the number `maxSubtasks`. Parse the reply text with `parsePlan`.
   - When the plan is `null`, or the call throws a `ModelError`, try again, up to `maxPlanAttempts` planner calls in total.
   - When every attempt fails, use the fallback plan `[{ id: 'task-1', instruction: question }]`.
2. **Work.** For each subtask, call `model.generate` with messages `[{ role: 'system', content: WORKER_SYSTEM }, { role: 'user', content: subtask.instruction }]`, using `runWithConcurrency` with `concurrency`. Each worker produces `{ id, status, output, error }`:
   - `finishReason` `'stop'` with non-blank text: `{ status: 'ok', output: text, error: null }`;
   - any other finish reason (refusal, truncation, filter) or blank text: `{ status: 'failed', output: null, error: finishReason }`;
   - a `ModelError`: `{ status: 'failed', output: null, error: error.code }`.
3. **Synthesize.** If every worker failed, skip this step and use `answer: null`. Otherwise call `model.generate` with messages `[{ role: 'system', content: SYNTHESIZER_SYSTEM }, { role: 'user', content }]`, where `content` contains the question, every successful output, and the ids of the failed subtasks. The answer is the reply text.
4. Return `{ answer, plan, results, usage }`, where `results` follow the plan order and `usage` is `{ calls, inputTokens, outputTokens, cost }` summed over **every response the model returned** (planner attempts included); a call that threw adds nothing.

Errors that are not a `ModelError` propagate. The tests script plans, failures, delays and prices, and check requests, results and totals, never the wording of model output.
