# Handoffs and Swarms

In orchestrator-workers, one agent keeps control and collects results. A **handoff** works differently: the current agent **passes control** of the conversation to a peer, and the peer answers the user directly. A triage agent hands a duplicate-charge complaint to billing; billing hands it to refunds; refunds answers. No manager sits above them. A system of peers coordinating only through handoffs (or shared state) is often called a **swarm**.

## A handoff is a tool call

The cleanest implementation reuses function calling (module 03). Each agent is offered one tool per peer it may hand off to, named after the target:

```ts
{ name: 'transfer_to_billing', description: 'Transfer the conversation to the billing agent ...',
  parameters: { type: 'object', properties: { reason: { type: 'string' } }, required: ['reason'] } }
```

When the model calls `transfer_to_billing`, your loop does not execute anything; it **switches the active agent**: the next model call uses billing's system prompt and billing's handoff tools. A reply with no handoff call is the answer. OpenAI's experimental Swarm library popularized this shape (a function that returns another agent), and its production successor, the OpenAI Agents SDK, exposes handoffs to the model as `transfer_to_<agent>` tools.

The allowed targets form a **graph** you design: triage may reach billing and tech; refunds may reach nobody. The graph is a permission boundary (module 08): an agent that may not issue refunds cannot hand the conversation straight to the refunds agent either. Calls outside the graph are rejected, and the model is told so with a tool result, exactly like an unknown tool in the agent loop.

## Carrying context

The receiving agent needs to know what happened. The usual default is to pass the **whole conversation**: the user's messages, the handoff call and a tool result that records who transferred to whom and why. Each agent swaps only the system prompt and tools.

- Passing everything keeps decisions visible (Cognition's "share full traces" principle) but grows the context with every hop and exposes one agent's tool results to the next.
- Filtering (dropping tool calls, summarizing earlier turns) keeps contexts small and limits what each agent sees, at the risk of losing a detail the next agent needed.

Choose per edge: a handoff to an agent with fewer permissions should usually see less.

## Loops without a manager

Without a central planner, nothing guarantees the conversation ends. Three failure shapes are common:

| Failure | Looks like | Guard |
| --- | --- | --- |
| **Ping-pong** | billing → tech → billing → tech, each convinced the other owns it | detect the alternating pattern in the path and stop |
| **Long chains** | triage → billing → tech → billing → refunds → ... | a maximum number of handoffs per conversation (the depth of the chain) |
| **Spinning in place** | an agent repeatedly calls handoffs it is not allowed to make | a maximum number of model calls (turns) |

Each guard ends the run with an explicit status (`ping_pong`, `handoff_limit`, `turn_limit`), never a silent answer, so the application can route the transcript to a human. Ping-pong in particular is a design signal: the two agents' instructions overlap, or neither owns the case. Fix the instructions or add an owner; do not just raise the limit.

Handoffs move control sideways. When agents can also **call other agents as tools** (delegation that returns a result), you add a second axis, nesting depth, which needs its own limit; lesson 06 covers delegation limits.

## Handoffs vs orchestrator-workers

| | Orchestrator-workers | Handoffs |
| --- | --- | --- |
| Who answers the user | the orchestrator | whichever agent holds control |
| Parallelism | yes, workers run concurrently | no, one active agent at a time |
| Best for | breadth: research, analysis | routing conversations between specialists |
| Main risk | cost, synthesis of bad results | loops, lost context, unclear ownership |

> **Status as of October 2026:** the OpenAI Agents SDK models handoffs as tools with input filters and optional history compaction; Swarm's repository is marked as replaced by it. LangGraph documents handoffs and swarm-style architectures; Google ADK uses agent transfer between sub-agents; Microsoft Agent Framework offers handoff orchestration. Claude Code's agent teams (experimental) let peers message each other and share a task list.

## When to choose it

Use handoffs when a conversation must move between specialists with different instructions, tools or permissions (support desks, intake flows), and each step needs the full conversation. Design the handoff graph explicitly, give every agent a clear ownership boundary, and set the three limits. If one agent with routing (module 07) can answer, or if the work splits into parallel parts, prefer those: a swarm is the hardest of the patterns to predict and to debug.
