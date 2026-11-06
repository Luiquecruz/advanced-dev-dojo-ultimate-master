# Map: Agents and Workflows

Until now every feature in this track made one model call, or a few calls in an order you wrote. This module answers the next question: **how should work repeat until it is done?** Sometimes the answer is a fixed sequence of calls in your code. Sometimes it is a loop where the model picks the next step itself. Either way, the loop needs limits, a human at the right moments, and a way to survive a crash halfway through.

## The question and the layer

This module belongs to **layer 4, the loop**: how work repeats until done. It sits between the harness (layer 3: the tools and permissions around the model, modules 03 and 08) and evaluation (layer 5: how you know the loop did the right thing, module 10).

| You decide | Options | The lesson |
| --- | --- | --- |
| Who chooses the next step | your code (workflow) or the model (agent) | 02 |
| Which fixed shape fits | chaining, routing, parallelization, evaluator-optimizer | 03 |
| How the model acts | tool calls in a loop that ends on a final answer | 04 |
| When the loop must stop | steps, tokens, cost, wall time, repeated calls | 05 |
| Where a human decides | approval gates, interrupt and resume | 06 |
| What happens after a crash | checkpoints and idempotent tools | 07 |
| When the tool is a screen or a sandbox | computer use, browser and code agents | 08 |

## Prerequisites

- **Module 01:** calling a model through a thin wrapper, reading `usage` for cost, retries for transient errors.
- **Module 02:** structured outputs (a routing decision or an evaluation is JSON you must validate).
- **Module 03:** function calling: the model proposes a tool call, your code executes it and sends the result back. This module puts that exchange in a loop.

## The path

1. **Workflows vs agents** (quiz). The core distinction of the module: predefined code paths versus a model that directs its own steps. Prefer the simplest design that works.
2. **Workflow patterns.** You build prompt chaining with a gate, routing, parallel sectioning and voting, and an evaluator-optimizer with a bounded number of rounds.
3. **The agent loop.** You build the loop every agent framework hides: call the model, run its tool calls, append the results, stop on a final answer, and survive broken arguments and unknown tools.
4. **Budgets and stop conditions.** You add step, token, cost and time limits, detect a stuck agent repeating the same call, and return a structured stop reason.
5. **Human-in-the-loop.** You pause before risky tools, return the run as plain JSON, and resume later with approve, deny or edit.
6. **Durable execution.** You checkpoint after every step, resume after a simulated crash, and use idempotency keys so a refund is never paid twice.
7. **Computer use and code agents** (quiz). Agents that act through screens, browsers and generated code, and the sandboxes they need.
8. **The agent ADR.** You write the spec of an agent for a briefing: pattern, tools, approvals, budgets, durability and failure modes.

## The thread through the module

Every lesson answers one failure of a naive loop. A loop with no shape wastes calls (02, 03). A loop that trusts the model's output crashes on a bad tool call (04). A loop with no limits burns money (05). A loop that acts alone does damage (06). A loop that lives in memory loses its work (07). The ADR at the end collects those answers for one product.

"Agent" means different things in different products. A widely quoted working definition is "an LLM agent runs tools in a loop to achieve a goal". Agent frameworks and SDKs implement these loops; this module builds them in plain code so you can read any of them.

## When to choose it

Take this module once you can call a model and handle tool calls. Agents are not the goal; finished tasks are. If a fixed sequence of calls solves your problem, lesson 03 is where you stop, and lessons 04 to 07 are what you add only when the number of steps cannot be known in advance.
