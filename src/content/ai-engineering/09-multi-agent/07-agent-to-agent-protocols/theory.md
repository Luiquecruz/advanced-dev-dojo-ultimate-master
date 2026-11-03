# Agent-to-Agent Protocols

Everything in this module so far ran inside one process: workers, handoffs and a blackboard you own end to end. Real systems also delegate to agents **you do not own**: a partner's claims agent, another team's compliance agent, a vendor's booking agent, each deployed, versioned and secured separately. That needs a protocol. Module 03 ("A2A, Agent Skills and Context Files") introduced A2A's agent cards, tasks and artifacts; this lesson goes deeper into the task lifecycle and into choosing between in-process calls, MCP and A2A.

## Three ways to reach another capability

| | In-process call | MCP tool | A2A task |
| --- | --- | --- | --- |
| What is on the other side | your own code or agent | a capability with a schema (tool, resource) | an opaque agent with its own model, tools and memory |
| Duration | milliseconds to minutes | usually short | seconds to days |
| Interaction | function call or handoff | request, structured result | multi-turn: it may ask questions or need authorization |
| Output | return value | tool result | messages and artifacts (documents, data, files) |
| Boundary | same deployment | client and server, often one organization | independent deployments, often different organizations |

The A2A project's own summary: MCP connects an agent to its tools ("vertical", deeper capabilities for one agent); A2A connects agents to each other ("horizontal", reach across teams and companies). They combine: a repair-shop agent talks to customers over A2A, uses its diagnostic tools over MCP, and orders parts from a supplier's agent over A2A.

## Discovery: the agent card

A client finds a remote agent through its **Agent Card**, a JSON document conventionally served at `/.well-known/agent-card.json`. It declares the name, description, version, the interfaces (URL plus protocol binding: JSON-RPC, gRPC or HTTP+JSON), capabilities (streaming, push notifications, an extended card), default input and output media types, the **skills** it offers (id, name, description, tags, examples) and the security schemes a client must use. Cards can be signed (JWS) so a client can verify the publisher, and an authenticated client may fetch an **extended card** with skills not shown publicly. A card is a claim, not a guarantee: treat skills from an unknown publisher like any untrusted tool description (module 12).

## The task lifecycle

A client sends a message (`SendMessage`). The agent answers either with a **Message** (a quick, self-contained reply, no state kept) or with a **Task**, the stateful unit of work.

```text
submitted ──▶ working ──▶ completed
                 │    ├──▶ failed
                 │    ├──▶ canceled   (client called CancelTask)
                 │    └──▶ rejected   (agent declined the work)
                 ├──▶ input-required ──(client sends a message with the taskId)──▶ working
                 └──▶ auth-required  ──(client completes authorization)─────────▶ working
```

The diagram shows the common path; an agent can also reject or a client cancel a task before work starts.

- **Interrupted states** (`input-required`, `auth-required`) pause the task until the client acts: the human-in-the-loop pattern of module 07, across organizations.
- **Terminal states** (`completed`, `failed`, `canceled`, `rejected`) are final. A terminal task cannot be restarted; messages sent to it are rejected. A follow-up ("make the boat red") is a **new task in the same `contextId`**, pointing at the earlier one with `referenceTaskIds`. Every task stays an immutable record of one unit of work, which makes auditing and billing tractable.
- **`contextId`** groups related tasks and messages into one conversation; the server may generate it and clients reuse it.
- **Artifacts** are the outputs (made of parts: text, files, structured data). A refined artifact keeps its name and gets a new `artifactId`; the client keeps the version history.

Following a long task has three options: **polling** `GetTask`, **streaming** (`SendStreamingMessage`, or `SubscribeToTask` to reattach) with status and artifact update events, and **push notifications** to a webhook the client registers, for work that outlives any connection. Design the client for the slowest case: persist the task id, resume after a crash (module 07, "Durable Execution"), and enforce your own timeout and budget, since the remote agent's limits are not yours.

## What A2A does not do for you

A2A standardizes the envelope, not the trust. You still validate artifacts before using them (lesson 06), decide what context to send to a third party (data governance, module 13), scope credentials per remote agent, and log every task for audit. The remote agent is opaque by design: you cannot inspect its prompt or tools, so treat its output like any untrusted input.

> **Status as of October 2026:** A2A was launched by Google in April 2025, moved to the Linux Foundation, reached 1.0 in March 2026 and joined the Agentic AI Foundation in August 2026. Version 1.0 names the operations `SendMessage`, `SendStreamingMessage`, `GetTask`, `ListTasks`, `CancelTask`, `SubscribeToTask`, push notification config operations and `GetExtendedAgentCard`, and spells task states on the wire as `TASK_STATE_COMPLETED`, `TASK_STATE_INPUT_REQUIRED` and so on. SDKs and framework integrations (Google ADK, Microsoft Agent Framework, LangGraph and others) adopt versions on their own schedules.

## When to choose it

Call your own agents **in-process** (functions, subagents, handoffs) when you deploy them together: it is simpler, faster and easier to debug. Expose a capability as an **MCP tool** when it has a clear input and output and returns quickly, even if an agent implements it. Use **A2A** when you delegate open-ended or long-running work to an agent that another team or company deploys and secures independently, especially when it needs to ask questions, request authorization or deliver documents over hours or days.
