Build a research orchestrator: a planner splits a question into subtasks, workers research them in parallel under a concurrency limit, and a synthesizer combines the findings. Malformed plans, failed workers and costs are part of the contract.

The starter defines the three system prompts (`PLANNER_SYSTEM`, `WORKER_SYSTEM`, `SYNTHESIZER_SYSTEM`). Requests, responses, subtasks and results are plain dicts whose keys keep the JSON names (`"finishReason"`, `"responseFormat"`, `"inputTokens"`). A subtask is `{"id": ..., "instruction": ...}`.

## 1. `parse_plan(text, max_subtasks)`

Return the subtasks of a plan, or `None` when the text is unusable.

- The plan is a JSON object `{"subtasks": [{"id": "...", "instruction": "..."}]}`. It may be surrounded by prose or a code fence: parse the text from the first `{` to the last `}`.
- Unusable (return `None`): no object, text that does not parse, `"subtasks"` missing, not a list or empty, any subtask whose `"id"` or `"instruction"` is not a non-blank string, or two subtasks with the same `"id"`.
- Return the subtasks as `{"id", "instruction"}` dicts, keeping only the first `max_subtasks`.

## 2. `run_with_concurrency(items, limit, run)`

Await `run(item, index)` for every item with at most `limit` calls in flight at any time, starting a new one as soon as one finishes. Return the results as a list **in input order**. An empty list returns `[]`.

## 3. `orchestrate(question, *, model, max_subtasks, concurrency, max_plan_attempts)`

1. **Plan.** Call `await model.generate(request)` with `"responseFormat": {"type": "json"}` and two messages: `{"role": "system", "content": PLANNER_SYSTEM}` and a `"user"` message containing `question` and the number `max_subtasks`. Parse the reply text with `parse_plan`.
   - When the plan is `None`, or the call raises a `ModelError`, try again, up to `max_plan_attempts` planner calls in total.
   - When every attempt fails, use the fallback plan `[{"id": "task-1", "instruction": question}]`.
2. **Work.** For each subtask, call `model.generate` with messages `[{"role": "system", "content": WORKER_SYSTEM}, {"role": "user", "content": subtask["instruction"]}]`, using `run_with_concurrency` with `concurrency`. Each worker produces `{"id", "status", "output", "error"}`:
   - `"finishReason"` `"stop"` with non-blank text: `{"status": "ok", "output": text, "error": None}`;
   - any other finish reason (refusal, truncation, filter) or blank text: `{"status": "failed", "output": None, "error": finish_reason}`;
   - a `ModelError`: `{"status": "failed", "output": None, "error": error.code}`.
3. **Synthesize.** If every worker failed, skip this step and use `"answer": None`. Otherwise call `model.generate` with messages `[{"role": "system", "content": SYNTHESIZER_SYSTEM}, {"role": "user", "content": content}]`, where `content` contains the question, every successful output, and the ids of the failed subtasks. The answer is the reply text.
4. Return `{"answer", "plan", "results", "usage"}`, where `"results"` follow the plan order and `"usage"` is `{"calls", "inputTokens", "outputTokens", "cost"}` summed over **every response the model returned** (planner attempts included); a call that raised adds nothing.

Errors that are not a `ModelError` propagate. The tests script plans, failures, delays and prices, and check requests, results and totals, never the wording of model output.
