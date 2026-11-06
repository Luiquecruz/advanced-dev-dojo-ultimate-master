# Orchestrator-Workers

In **orchestrator-workers**, a lead model (the orchestrator, or supervisor) reads the task, decides at runtime how to split it, hands each piece to a worker, and combines what comes back. It differs from the parallel sectioning of module 07 ("Workflow Patterns") in one way: **the split is not known in advance**. A question about three vendors becomes three subtasks; a question about twelve becomes twelve. That flexibility is why it is the most common multi-agent pattern, and why its plan must be treated as untrusted model output.

## The four stages

```text
question ──▶ planner ──▶ [subtask, subtask, subtask] ──▶ workers (parallel, limited) ──▶ synthesizer ──▶ answer
                 │                                            │                              │
               usage                                        usage                          usage  ──▶ total cost
```

1. **Plan.** One JSON request: "split this into independent subtasks, at most N". The reply is structured output (module 02), so parse it defensively: extract the object from prose or a code fence, validate every field, reject duplicates, cap the count. A planner that returns fifty subtasks for a simple question is a known failure; the cap is a budget.
2. **Work.** Each worker gets a clean context with only its instruction, which is the context-isolation benefit from the previous lesson. Workers run **in parallel under a concurrency limit**: providers rate-limit you (module 01), and twenty simultaneous calls usually mean twenty `429`s.
3. **Contain failures.** One worker hitting a `503`, refusing, or being truncated is normal at scale. Record it as a failed result and continue. Only when *every* worker failed is there nothing to synthesize.
4. **Synthesize.** The orchestrator receives the question, the successful findings labeled by subtask, and the list of failed subtasks, so the answer can say what it could not cover instead of silently omitting it.

## Surviving a bad plan

The plan is the single point of failure: if it does not parse, there is no work to do. Three layers keep the run alive:

- **Tolerant extraction** recovers the common wrappers ("Here is the plan:" plus a fenced block).
- **Re-planning** asks again when the reply is unusable (truncated, trailing comma, wrong shape, refusal, a provider error), up to a small number of attempts.
- **A fallback plan** of one subtask (the whole question) degrades the system to a single worker instead of failing. It is slower and less thorough, but it answers.

## A concurrency limit in a few lines

`Promise.all` over every subtask starts them all at once. A limit runs a fixed number of **lanes**, each pulling the next item from a shared index until none are left; results go into their input position so order never depends on timing.

```ts
const lane = async () => {
  while (next < items.length) {
    const index = next++;
    results[index] = await run(items[index], index);
  }
};
await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
```

## Cost accounting

A multi-agent run is many calls, and the bill is their sum. Add the provider-reported `usage` of **every response**: planner attempts (including the plan you threw away), every worker (including a refused one: a refusal still costs tokens), and the synthesis. Errors that return no response cost nothing you can see, so they add nothing. Report calls, input and output tokens and cost per run; those numbers decide whether the design pays off (lesson 02) and feed the ADR at the end of the module.

Two refinements matter in production: a **per-run budget** that stops spawning workers when spending crosses a limit (module 07, "Budgets and Stop Conditions"), and writing worker outputs to storage and passing **references** instead of full text when results are large, so the synthesizer's context stays small.

## Pitfalls

- Trusting the plan: no validation, no cap, no fallback.
- Unbounded parallelism that turns into a burst of rate-limit errors.
- One worker's exception rejecting the whole `Promise.all`.
- Synthesizing without telling the model which subtasks failed, so gaps become confident omissions.
- Counting only the final call's cost.
- Vague worker instructions: Anthropic reported subagents duplicating each other's searches until each instruction named an objective, an output format and clear boundaries.

Frameworks ship this pattern under different names: supervisor, subagents, agents as tools or hierarchical processes. Published systems run a lead with a handful of parallel workers for typical queries and more for complex ones; size the fan-out from your own measurements.

## When to choose it

Use orchestrator-workers when the decomposition depends on the input (how many vendors, files or sources), subtasks are independent, and a synthesis step adds value. If the split is always the same, write it as a fixed fan-out in code instead: cheaper and testable. If subtasks depend on each other's decisions, keep them in one agent or run them in sequence with the full trace passed along.
