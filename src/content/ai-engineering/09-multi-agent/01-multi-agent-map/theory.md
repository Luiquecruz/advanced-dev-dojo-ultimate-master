# Map: Multi-Agent Systems

Module 07 built one agent: a model calling tools in a loop, with budgets, approvals and checkpoints. Module 08 wrapped it in a harness. This module answers the question that comes next, usually too early: **when should the work be split across several agents, and how do you keep the split from multiplying cost and errors?** Every multi-agent design is a trade: more parallelism and cleaner contexts in exchange for more tokens, more coordination and more ways to fail.

## The question and the layer

This module belongs to **layer 4, the loop**: how work repeats until done. A multi-agent system is several loops that pass work, control or state between them. It leans on the harness (layer 3) for each agent's tools and permissions, and on evaluation (layer 5, module 10) to prove the extra agents earn their cost.

| You decide | Options | The lesson |
| --- | --- | --- |
| Whether to split at all | one agent, a workflow, or several agents | 02 |
| Who plans and who executes | an orchestrator that delegates to parallel workers | 03 |
| Who holds control | peer agents passing control with handoffs | 04 |
| How agents share facts | a blackboard with owners, versions and a log | 05 |
| How the system fails | cascading errors, agreement bias, runaway delegation | 06 |
| How agents talk across systems | in-process calls, MCP tools or A2A tasks | 07 |

## Prerequisites

- **Module 07:** the agent loop, budgets and stop conditions, and the workflow patterns, especially parallelization and voting. Orchestrator-workers was deferred from there to here.
- **Module 08:** verifiers and loop engineering: every agent's output is checked before anything trusts it.
- **Module 03:** function calling (a handoff is a tool call) and the A2A basics: agent cards, tasks and artifacts.
- **Module 01:** reading `usage` for cost; a multi-agent run is the sum of many calls.

## The path

1. **Why multiple agents** (quiz). What splitting buys (breadth, parallel subtasks, context isolation) and what it costs (a token multiplier, coordination, conflicting decisions), with the published evidence on both sides.
2. **Orchestrator-workers.** You build a planner that returns subtasks as JSON and survives malformed plans, parallel workers under a concurrency limit, a synthesis step, and cost accounting over every call. A failed worker does not sink the run.
3. **Handoffs and swarms.** You build peer agents that pass control with handoff tool calls, carry the conversation along, and stop on a handoff limit, ping-pong between two agents, or a turn limit.
4. **Shared state.** You build a blackboard with an owner per key, compare-and-set versions that reject stale writes, and an append-only log you can rebuild state from.
5. **Multi-agent failure modes.** You validate worker outputs before they spread, run independent votes before any discussion, and cap delegation by depth, fan-out, cycles and total count.
6. **Agent-to-agent protocols** (quiz). The A2A task lifecycle in depth, how it differs from MCP and from in-process handoffs, and when to use which.
7. **The multi-agent ADR.** You decide single agent or multi-agent for two features of one product from measured pilot numbers, and write the plan: workers, concurrency, budgets, limits, validation and protocols.

## The thread through the module

Each lesson turns an implicit assumption into explicit code. The orchestrator assumes plans are valid and workers succeed (03); handoffs assume agents eventually stop passing the ball (04); shared state assumes agents do not overwrite each other (05); synthesis assumes worker outputs are true and votes are independent (06). None of those assumptions holds by default. The ADR asks the question underneath them all: does this product need more than one agent?

Multi-agent support ships in most agent frameworks, as supervisors, subagents, handoffs or teams, and open protocols exist for agents to talk across vendors. Names, defaults and maturity change quickly; this module builds the mechanisms in plain code so you can read any of them.

## When to choose it

Take this module when a single agent is measurably limited by its context window, by work that could run in parallel, or by responsibilities that must stay separated (different tools, permissions or owners). If one well-equipped agent with good tools passes your evals, read lesson 02 and the ADR and stop there: the most common multi-agent decision is "not yet".
