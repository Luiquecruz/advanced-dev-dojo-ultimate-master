# Budgets and Stop Conditions

An agent loop with no limits is a bill with no ceiling. Models do not reliably notice they are going in circles: they page through search results forever, retry the same failing call, or keep "verifying" an answer they already have. Every production loop needs budgets the code enforces, plus a clear report of which one ended the run.

## The budgets

| Budget | Protects against | Measured with |
| --- | --- | --- |
| Steps | endless loops, runaway context growth | number of model calls |
| Tokens | context bloat, quota exhaustion | `usage.totalTokens` summed over calls |
| Cost | the bill | `usage.cost` (or tokens × price) summed over calls |
| Wall time | users waiting, jobs that never end | an injected clock |
| Repetition | a stuck agent spending the rest of every budget | signatures of recent tool calls |

Steps alone are not enough. Each step resends the growing conversation, so the tenth step of a run can cost many times the first. A run of 8 steps that reads three large documents can cost more than 30 short steps. Budget what you actually pay for.

Use the provider's **reported usage**, not your own estimate: module 01 showed that tokenizers differ, and usage is what appears on the invoice.

## Where each check goes

```ts
while (true) {
  if (usage.steps >= budget.maxSteps) return finish('max_steps');
  if (now() - startedAt >= budget.maxDurationMs) return finish('timeout');
  const response = await model.generate({ messages, tools });
  addUsage(response.usage);
  if (response.toolCalls.length === 0) return finish('done', response.text);
  if (usage.costUsd >= budget.maxCostUsd) return finish('max_cost');
  await runTools(response.toolCalls);
}
```

- **Before a call:** limits that decide whether the next call may start (steps, time). Never start work you have already decided you cannot afford.
- **After a call:** limits the call itself consumed (tokens, cost). If the budget is gone, **do not execute** that response's tool calls; a side effect you cannot follow up leaves the world half-changed.
- **A final answer wins.** If the call that crossed the budget produced the answer, return it. The budget existed to protect against waste, and this was not waste.

Inject `now` instead of calling `Date.now()` directly; timeouts then become deterministic in tests. In production, also pass an `AbortSignal` so a slow call in progress can be cancelled when the deadline passes.

## Detecting a stuck agent

A stuck agent repeats itself: the same tool with the same arguments, several times in a row. Compare **normalized** calls: parse the arguments and sort keys, so `{"query":"x","page":1}` and `{"page":1,"query":"x"}` count as the same call. After `repeatLimit` identical calls, stop before running the repeat.

Variants worth knowing: alternating between two calls (A, B, A, B), a run of tool errors, or many steps with no new information. Start with the simple consecutive check; add others when traces show them.

## Structured stop reasons

Return *why* the run ended, not just a boolean:

```ts
{ stop: { reason: 'max_cost', detail: 'Spent $0.2140 of a $0.20 budget.' }, answer: null, usage, elapsedMs }
```

The caller switches on `reason`: show the answer for `done`, retry with a different strategy for `stuck`, hand off to a human for `max_steps` with the conversation attached. The same fields feed dashboards (stop reasons per day), alerts (cost per run) and trajectory evals in module 10. The `detail` is for humans reading logs.

## Choosing the numbers

Set budgets from traces, not intuition. Run the agent on a representative set of tasks, look at successful runs, and set the step limit somewhat above their p95 (many teams use 1.5× to 2×) so normal runs finish and abnormal ones stop. Derive the cost cap from the price you can afford per task. Wall time comes from the product: what a user will wait for, or the job's slot in a schedule. Revisit the numbers when the model, prompt or tools change.

## Pitfalls

- A step limit as the only budget, so expensive steps still blow the bill.
- Estimating cost from your own token count instead of reported usage.
- Executing tool calls after the budget was exhausted.
- A stop that returns `null` with no reason, so callers cannot tell a timeout from a refusal.
- Comparing raw argument strings for stuck detection, so key order hides repeats.
- Budgets so generous they never fire, or so tight that normal tasks fail.

> **Status as of October 2026:** agent frameworks expose these limits under different names: a maximum number of turns in the OpenAI Agents SDK, a recursion limit in LangGraph, usage limits on requests, tokens and tool calls in Pydantic AI, maximum turns and budget options in the Claude Agent SDK. Defaults differ between them and between versions, so always set the values explicitly. Provider-side spending limits exist per organization or project, but they act far too late to protect a single run.

## When to choose it

Every agent loop needs at least a step limit and a cost limit; add wall time when a user or a schedule is waiting, and stuck detection when traces show repetition. Workflows with a fixed number of calls need no step budget, but long-running or user-triggered ones still benefit from a cost cap. When a budget stops a run, decide up front what happens next (a human handoff, a cheaper fallback, an apology), because "the agent just stopped" is not a product behavior.
