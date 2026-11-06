# Why Multiple Agents

A **multi-agent system** runs several model loops, each with its own system prompt, tools and message history, and connects them: one agent delegates to others, passes control to a peer, or reads what others wrote to shared state. Each agent is the loop from module 07. What is new is the wiring between them, and the wiring is where both the gains and the failures come from.

## The patterns

| Pattern | Who holds control | Typical use |
| --- | --- | --- |
| **Orchestrator-workers** (supervisor) | a lead agent plans, delegates and synthesizes | broad research, multi-part analysis |
| **Pipeline** | fixed order, each agent transforms the previous output | draft, review, translate |
| **Handoffs** | control passes from one peer to the next | triage to billing to refunds |
| **Debate and voting** | several agents answer, then compare or vote | high-stakes judgments |
| **Blackboard** | agents read and write shared state | long investigations with many contributors |

A **swarm** is the decentralized end of the spectrum: peer agents coordinating through handoffs or shared state with no central planner. It is more flexible and less predictable, so it is `emerging` rather than a default.

## What splitting buys

- **Breadth.** A research question with ten independent directions ("compare these twelve vendors") can be explored by several workers at once, each running its own searches. Total work is larger, but wall time shrinks.
- **Parallel independent subtasks.** Work that splits cleanly (one subtask per vendor, per file, per data source) runs concurrently. Latency approaches the slowest subtask instead of the sum.
- **Context isolation.** Each worker starts with a clean context window, burns through pages of search results or logs, and returns a condensed result. The lead never sees the noise, so its own context stays focused. This is often the real benefit, even more than speed: it is context engineering (module 02) applied across agents.
- **Separated responsibilities.** Different tools, permissions or owners per agent: the agent that reads customer records is not the one that can send email.

## What it costs

- **A token multiplier.** Every worker re-reads instructions, calls tools and writes a summary. Anthropic reported its agents using about 4× the tokens of a chat interaction and its multi-agent research system about 15×. The task must be worth it.
- **Coordination overhead.** Someone has to plan, split, collect, merge and resolve conflicts. A lead that spawns fifty workers for a simple question wastes money; workers with vague instructions duplicate each other's work.
- **Conflicting implicit decisions.** Cognition's "Don't Build Multi-Agents" argues that every action carries implicit decisions (style, assumptions, interpretation), and parallel agents that cannot see each other's work make incompatible ones. Their example: one subagent built a background in the wrong game's style, another a bird that did not match it, and the merge step inherited both. Their principles: share full context and traces, not just messages; and avoid splitting work whose decisions depend on each other.
- **Harder debugging.** A wrong answer can come from the plan, any worker, a lost message or the synthesis. You need traces across agents (module 10).

## Reading the evidence

Anthropic's research system (a lead model delegating to parallel subagents) beat a single agent by 90.2% on its internal research evaluation. The same article reports that on the BrowseComp benchmark, **token usage alone explained 80% of the performance variance**, and three factors (tokens, number of tool calls, model choice) explained 95%. Read together: a large part of the multi-agent gain is the ability to spend more tokens in parallel on breadth-first tasks. The article itself lists poor fits: tasks where all agents need the same context, tasks with many dependencies between agents, and most coding tasks, which split into fewer truly independent parts than research does.

Cognition's article and Anthropic's agree more than their titles suggest. Both say to isolate work that is truly independent and keep tightly coupled work in one context.

## A decision checklist

1. Does a single agent with good tools fail the evals? If not, stop here.
2. Is the failure about **breadth or context size** (too much to read for one context window)? Workers with isolated contexts may help.
3. Do the subtasks share **decisions**, not just a topic? Then they are not independent: keep them in one agent, or run them in sequence with the full trace passed along.
4. Is the task **valuable enough** to pay a multiple of the single-agent cost? Measure cost per successful task, not per call.
5. Can you **verify** each agent's output before others build on it? If not, errors will cascade (lesson 06).

Published multi-agent results and the published arguments against them both come from specific tasks and model generations. Model capabilities and token multipliers change; rerun the comparison on your own task before trusting anyone's numbers.

## When to choose it

Choose multiple agents for breadth-first, parallelizable work whose subtasks are truly independent and whose value justifies a several-fold token bill, or when responsibilities must be separated by tools, permissions or owners. Choose a single agent (with compaction, memory and good tools) for coupled work such as editing one document or one codebase, where decisions depend on each other. Choose a workflow (module 07) when the split is known in advance: a fixed fan-out in code is cheaper and more predictable than a planner deciding it.
