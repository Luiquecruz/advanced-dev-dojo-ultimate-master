# Map: Evaluation and Observability

The modules so far built features around a model: prompts and structured outputs, tools, retrieval, memory, agents and the harness around them. Each lesson tested its code against the fake model, which proves your code *handles* model behavior. None of it proves that a real model, with your prompt, on your users' inputs, gives *good* answers. This module answers the question every earlier module deferred: **how do we know it works, and how do we see what it did?**

## The question and the layer

This module is **layer 5, evaluation**: evals, traces, regression suites and online metrics. It sits on top of every other layer, because every decision in them is a hypothesis until it is measured: is the cheap model good enough (module 01), did the new prompt help (02), does the agent call the right tools (07), does the verifier catch what it should (08)? Governance (module 13) then uses the evidence this layer produces: a model may be promoted only when its evals pass.

| You decide | Options | The lesson |
| --- | --- | --- |
| How to test non-deterministic output | golden datasets; exact, regex, schema and semantic scorers; per-case reports | 02 |
| How to score what code cannot | rubric and pairwise judges, calibration with Cohen's kappa, bias checks | 03 |
| Whether a change may ship | baseline vs candidate, repeats, tolerance, critical cases | 04 |
| Whether an agent behaved | required, forbidden and ordered tool calls, step and cost limits | 05 |
| What happened in one request | spans per model and tool call, GenAI attributes, token and cost rollups | 06 |
| Whether it still works after release | online scorers, user feedback, drift, sampling for review | 07 |

## Prerequisites

- **Module 01:** non-determinism, usage and cost per call, retries, pinned snapshots.
- **Module 02:** structured outputs with Zod and JSON repair, prompts as code (versions and tests per prompt).
- **Module 04, Evaluating Retrieval:** golden sets and metrics for the retrieval half of RAG; this module evaluates everything else.
- **Module 07:** the agent loop and its budgets, whose runs become the trajectories of lesson 05.
- **Module 08, Verifiers:** checks inside one run; evals are the same idea across many runs and versions.

## The path

1. **Evals as tests.** You build an eval runner: dataset, exact, schema and semantic scorers, a per-case and aggregate report, and model errors counted as failures instead of crashes.
2. **LLM as judge.** You build a rubric judge that survives malformed output, calibrate it against human labels with agreement and Cohen's kappa, and detect position bias by swapping pairwise order.
3. **Regression gates.** You compare a baseline and a candidate on the same dataset with repeated runs, diff every case and block regressions beyond the noise or on critical cases.
4. **Agent trajectory evals.** You record agent runs and check required tools, order constraints, forbidden calls, step and cost limits, reporting every violation.
5. **Tracing.** You build spans for model and tool calls with OpenTelemetry GenAI attributes, keep prompt content out unless opted in, and roll up tokens and cost per trace.
6. **Production feedback and drift** (quiz). Online evaluation, explicit and implicit feedback, the kinds of drift, and sampling traces for human review.
7. **The evaluation ADR.** You design the eval plan of an agentic reply assistant: critical cases, scorers, judge, gate, tracing, review sampling and drift alerts.

## The thread through the module

Every lesson replaces an impression with a number and a reason. Scorers say *why* a case failed (02); calibration says *whether* to trust the judge (03); the gate says *whether* the change is worse beyond noise (04); trajectories say *where* the agent went wrong (05); traces say *what* happened and what it cost (06); feedback and drift say *when* the dataset stopped matching reality (07). This is also the answer to the bad practice the track keeps returning to: **vibes-based evaluation**, where a change ships because a few demo prompts looked fine.

> **Status as of October 2026:** evaluation and observability tooling is crowded and consolidating: open-source runners (promptfoo, DeepEval, Ragas, Inspect AI), platforms that combine traces, datasets and experiments (Langfuse, LangSmith, Braintrust, Arize Phoenix, W&B Weave) and general APM vendors adding LLM views. The OpenTelemetry GenAI semantic conventions are the common format for traces. This module builds each mechanism in plain code so you can judge any of these tools.

## When to choose it

Take this module before a model feature reaches real users, and in any case before its second prompt change: the first change is when a baseline starts to matter. If you only run offline batch jobs, lessons 02 to 04 are the core; if you run agents, add 05 and 06; if you operate a feature in production, lesson 07 and the ADR are where the work continues long after launch.
