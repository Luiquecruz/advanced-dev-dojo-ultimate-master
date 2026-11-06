# Map: Tools and Protocols

A model on its own can only write text. Everything an AI feature *does* (look up an order, refund an invoice, open a ticket, ask another company's agent for help) happens through tools that your code executes. This module answers one question:

> **How does a model act on the world, and how do those capabilities reach it in a way that is reliable, reusable and safe?**

## Where it sits

Tools belong to **layer 3, the harness**: what surrounds the model. Module 02 decided what the model *sees*; this module decides what it can *do*, how capabilities are described to it, and how they are shared between applications. Module 08 returns to the harness with permissions, sandboxes and hooks around the same tools, and module 12 with their security.

| Concern | Lesson | You will be able to |
| --- | --- | --- |
| The mechanism | 02 Function calling | run a tool loop that survives broken arguments and unknown tools and always stops |
| The interface | 03 Designing tools for models | write schemas, descriptions, errors and outputs a model uses correctly |
| The standard | 04 MCP concepts | explain hosts, clients, servers, tools vs resources vs prompts, transports and auth |
| The server side | 05 Building an MCP server | implement the JSON-RPC methods of a stateless MCP server |
| The client side | 06 MCP clients and tool overload | aggregate several servers, namespace and route tools, load them on demand under a budget |
| The neighbors | 07 A2A, skills and context files | tell when to delegate to another agent, package procedures as skills, and brief coding agents |
| The decision | 08 Tools ADR | choose the integration mechanism, tool catalog and loading strategy for a product |

## Prerequisites

- Module 01: calling a model through the provider-agnostic `generate()`, message roles, tokens and cost.
- Module 02 helps: structured outputs and schema validation with Zod, context budgets.
- From the Node.js track: JSON, HTTP and async patterns; JSON-RPC appears here for the first time and is explained in lesson 05.

## The path

1. **Mechanism first.** Function calling is the same idea in every provider: the model proposes, your code executes, results go back as messages. You write the loop and its failure handling yourself before any framework does it for you.
2. **Then the interface.** A tool is an API whose user is a model. Names, descriptions, schemas and error texts decide whether it gets used correctly.
3. **Then the protocol.** When several applications need the same tools, MCP replaces one-off adapters. You learn the concepts, build a server, then build the client that copes with many servers and too many tools.
4. **Then the neighbors.** A2A for delegating to other agents, Agent Skills for on-demand procedures, AGENTS.md for repositories, and the foundation that now governs them.
5. **Finally, the ADR.** You decide, for a support product, which systems become plain tools, MCP servers or A2A peers, what the tool catalog looks like and how tools are loaded within a budget.

The challenges run against the fake model and in-memory MCP servers: no network, no keys. They test handling (an unknown tool, an invalid argument, a protocol version mismatch), never the model's wording.

Function calling is supported by every major model API. MCP is `established`, while A2A and Agent Skills are still `emerging`, and open standards of this kind are governed by foundations. Check the project sites for the current revision of each.

## When to choose it

Take this module before building anything agentic: agents (module 07), harnesses (module 08) and multi-agent systems (module 09) are all tool loops underneath. If you already ship tool-using features, skim lessons 02 and 03, read lesson 04 for the stateless design of current MCP, and go straight to the ADR. Keep the cross-cutting question in mind: a deterministic lookup you always need is cheaper as plain code before the model call than as a tool the model must remember to use.
