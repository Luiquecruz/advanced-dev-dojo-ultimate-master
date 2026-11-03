# Agent Trajectory Evals

An agent's final answer can be right for the wrong reasons. "I refunded $30 to your card" is the correct reply, but the run may have issued the refund without looking up the order, tried to delete an account on the way, or spent twenty model calls going in circles. The opposite also happens: every step is reasonable and the final message still misstates the amount. Evaluating agents therefore takes two views:

- **Outcome:** did the task succeed? Check the final answer (the scorers of Evals as Tests) and, better, the **final state**: is there exactly one refund of $30 on order A-1?
- **Trajectory:** was the path acceptable? Which tools were called, in what order, with which arguments, at what cost?

This lesson is about the second view. The trajectory is the record of every model response and tool call in a run; tracing (next lesson) produces it in production, and a recorder around the agent loop (The Agent Loop) produces it in tests.

## What to check on a trajectory

| Check | Question | Example |
| --- | --- | --- |
| **Required tools** | did the agent gather what the task needs? | `get_order` succeeded at least once |
| **Order constraints** | did prerequisites come first? | no `issue_refund` before a successful `get_order` |
| **Forbidden tools** | did it stay inside its job? | never `delete_account` in a refund task |
| **Forbidden calls** | were the arguments within policy? | no refund above $100 without approval |
| **Limits** | was it efficient enough? | at most 4 model calls, $0.01 per run |
| **Status** | did it finish? | `done`, not `max_steps` or `refused` |

**Count attempts, not just executions.** A call to `delete_account` that the harness blocked (Permission Policies) still shows the agent tried. The harness kept you safe this time; the eval tells you the model or the prompt needs work before the next harness gap.

**Report every violation.** A trajectory that skipped the lookup *and* exceeded its budget has two problems with two different fixes; stopping at the first hides the second.

## Constraints, not golden paths

The tempting design is a golden trajectory: "the agent must call exactly `get_order`, then `issue_refund`, then answer". It breaks constantly. Agents legitimately take different valid paths: they look the order up twice, check the policy first, or batch two calls in one turn. A **strict match** fails all of them and trains the team to ignore the eval.

Prefer **properties** that every acceptable path satisfies: required and forbidden sets, partial orders ("A before B", not "A immediately before B"), argument predicates and limits. Keep strict matching for the few flows where the exact sequence is the requirement (a compliance check that must precede any action). Libraries offer the same spectrum as match modes: strict, unordered, subset and superset.

## Reliability across runs

An agent that passes a task once may fail the same task the next time. Run each task several times and report how many runs pass. τ-bench made this explicit with **pass^k**: the probability that *all* k attempts succeed, which drops quickly for agents that only usually behave. For a support agent, "succeeds 3 times out of 3" is the number customers feel; "succeeded once in 3 tries" is a demo.

## Where trajectories come from

- **Tests and CI:** run the agent against the fake model or a recorded cassette, with tools stubbed, and evaluate the recorded trajectory.
- **Production:** the trace of each run (spans per model and tool call) *is* a trajectory. Sample traces, evaluate them with the same checks, and alert on forbidden calls (lesson Production Feedback and Drift).
- **Simulated users:** for multi-turn tasks, a second model plays the customer; the trajectory includes both sides.

## Model-based trajectory review

Some properties are hard to express as rules: "the agent asked a clarifying question when the order id was ambiguous", "it did not repeat the same search with trivial changes". An LLM judge can review a trajectory against a rubric (LLM as Judge), with the same calibration duties. Use rule-based checks first: they are exact, cheap and explain themselves.

## Pitfalls

- Scoring only the final answer of an agent that takes actions.
- Golden-path matching that fails every valid alternative.
- Ignoring blocked or failed calls, so unsafe intent never shows up.
- One run per task, so a flaky agent looks reliable.
- No limits in the eval, so a 30-step run that eventually succeeds counts as a pass.

> **Status as of October 2026:** τ-bench and its successors evaluate tool-using agents by final database state and pass^k; SWE-bench evaluates coding agents by running the repository's tests. LangChain's agentevals offers trajectory match modes (strict, unordered, subset, superset) and LLM trajectory judges; Inspect AI, Braintrust and LangSmith evaluate agent traces. Anthropic's "Demystifying evals for AI agents" (January 2026) contrasts outcome and transcript graders and pass@k with pass^k.

## When to choose it

Add trajectory checks as soon as an agent can take actions with side effects, cost real money per run, or must follow a procedure (a lookup before a refund, an approval before a payment). Start with forbidden tools and limits, which catch the expensive failures, then add required tools and order constraints for the procedure. For read-only agents that only answer questions, outcome evals and a step limit are usually enough.
