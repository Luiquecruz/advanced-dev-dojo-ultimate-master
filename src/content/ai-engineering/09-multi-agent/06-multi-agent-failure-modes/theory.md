# Multi-Agent Failure Modes

A single agent fails in ways you have already handled: bad tool calls, loops, budgets (module 07). Multi-agent systems add failures that live **between** agents: one agent's mistake becomes another's input, agents agree with each other instead of checking, and delegation grows without bound. They are hard to see because every individual agent looks reasonable.

## What the research says

The paper "Why Do Multi-Agent LLM Systems Fail?" (Cemri et al., UC Berkeley, 2025) annotated more than 1,600 execution traces from seven multi-agent frameworks and built **MAST**, a taxonomy of 14 failure modes in three categories:

| Category | Examples of failure modes |
| --- | --- |
| **System design issues** | disobeying the task or role specification, step repetition, loss of conversation history, unaware of termination conditions |
| **Inter-agent misalignment** | conversation reset, failing to ask for clarification, task derailment, withholding information, ignoring another agent's input, reasoning-action mismatch |
| **Task verification** | premature termination, no or incomplete verification, incorrect verification |

Two findings matter for engineers. First, the largest category is system design (specifications, roles, termination), and verification gaps add many more: these are decisions around the model, so they are yours to fix rather than waiting for a better model. Second, the cheap interventions the authors tried (clearer role specifications, an added high-level verification step) helped measurably but left task success low: structure and checks in code matter more than better prompts.

## Cascading errors

A worker invents a pricing figure; the synthesizer quotes it; a reviewer agent, seeing a confident number with a citation, approves it. Each hop **launders** the error: by the end it looks like a verified fact. In a pipeline of agents, error rates compound just as they do across the steps of one agent.

The containment rule is the verifier from module 08, applied at every boundary: **validate a worker's output before anything else consumes it.** Make outputs structured so they can be checked mechanically: well-formed JSON, the fields you asked for, finished (not truncated), and every claim pointing to a source the worker was actually given. A citation to a source outside that list is a hallucination signal you can detect without judging the text. Then:

1. **Retry with feedback**: tell the worker exactly what was wrong ("claim 2 cites unknown source s7").
2. **Quarantine** what still fails: keep it out of the synthesis, record why, and let the final answer say the subtask could not be completed.

## Agreement bias

Agents built on similar models share blind spots, and models tend to defer to confident statements in their context. When reviewers see each other's opinions before forming their own, the first answer **anchors** the rest; a "debate" quickly becomes a chorus. Multi-agent debate can improve reasoning, but only when the agents' first answers are formed independently.

The fix is procedural, like a well-run human review:

- **Vote first, discuss later.** Every voter answers in parallel, seeing only the question.
- **Count against a quorum over all voters.** Abstentions (refusals, malformed answers, errors) count against consensus, not as silent removals.
- **Discuss only on disagreement**, and share the answers anonymously, so no voter defers to a role or a name.
- **Escalate** when there is still no quorum. "No consensus" is a valid, useful result.

Diversity helps too: different instructions, different evidence or different models per voter make independent errors more likely.

## Runaway delegation

When agents can delegate to other agents, delegation needs the same limits as recursion:

| Limit | Prevents |
| --- | --- |
| **No cycles** | A delegates to B, which delegates back to A |
| **Maximum depth** | workers spawning workers spawning workers |
| **Maximum fan-out** per delegator | one agent spawning fifty subagents for a simple question |
| **Maximum total** delegations per run | the whole tree growing past the budget |

A guard checks each delegation request against the chain from the root to the requester, before any model call is made. Denials are cheap; an unbounded tree is not.

Published taxonomies of multi-agent failures, with annotated execution traces, are a good checklist for your own reviews. Frameworks increasingly ship guards (maximum turns, handoff limits, nesting limits, guardrails on agent outputs), but defaults differ and are often generous; set them explicitly.

## When to choose it

Apply these defenses in any system where one agent's output becomes another agent's input: validate at every boundary, keep independent judgments independent, and bound delegation. If you cannot verify a worker's output mechanically, keep that work in a single agent with human review, or redesign the output until it can be checked.
