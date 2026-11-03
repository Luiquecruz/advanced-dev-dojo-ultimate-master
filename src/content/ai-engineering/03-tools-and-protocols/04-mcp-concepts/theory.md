# MCP Concepts

Function calling solves one integration: one application, its own tools. When every AI application (IDE agents, chat apps, internal assistants) needs the same tools (GitHub, the ticket system, the data warehouse), each pair needs its own adapter: *M* applications × *N* systems. The **Model Context Protocol (MCP)** turns that into *M* + *N*: each system ships one MCP server, each application ships one MCP client, and they interoperate. It plays the role for AI tools that the Language Server Protocol played for editors.

## Participants

| Role | What it is | Example |
| --- | --- | --- |
| **Host** | The AI application the user works in; it owns the model, the UI, consent and security policy | an IDE agent, a desktop chat app, your support agent |
| **Client** | A connector inside the host, one per server | the host's GitHub connection |
| **Server** | A program that exposes capabilities over MCP | a GitHub server, a Postgres server, your helpdesk server |

Servers can run locally (launched by the host as a subprocess) or remotely (a URL your organization or a vendor operates). The host decides which servers are connected and what reaches the model; a server never sees the conversation unless the host sends it.

## Server primitives: who controls them

| Primitive | Controlled by | Used for | Methods |
| --- | --- | --- | --- |
| **Tools** | the **model** | actions and live queries the model decides to call | `tools/list`, `tools/call` |
| **Resources** | the **application** | read-only context (files, records, schemas) the host or user attaches | `resources/list`, `resources/read`, templates |
| **Prompts** | the **user** | reusable templates the user picks, often as slash commands | `prompts/list`, `prompts/get` |

The control column is the useful design question. If the model should decide when to fetch it, it is a tool. If the user or the application selects it as context, it is a resource. If it is a workflow the user starts on purpose ("review this PR"), it is a prompt.

On the client side, a server may ask the host for things it cannot do alone: **elicitation** (ask the user for input, such as a confirmation or a missing value) and, in older designs, **sampling** (ask the host's model for a completion) and **roots** (which directories the server may touch). The 2026-07-28 revision deprecated sampling and roots, and servers now request input through *multi round-trip requests*: the result says `input_required`, and the client retries with the answers.

## The protocol underneath

MCP messages are **JSON-RPC 2.0** requests, responses and notifications. Two standard transports carry them:

- **stdio**: the host launches the server as a subprocess and exchanges newline-delimited JSON on stdin and stdout. Simple, local, credentials from the environment.
- **Streamable HTTP**: each message is an HTTP POST to one endpoint; replies are JSON or a request-scoped event stream. Used for remote servers.

Since revision **2026-07-28**, the protocol is **stateless**: no `initialize` handshake, no session id. Every request carries its protocol version and the client's capabilities in `_meta`, and servers advertise theirs through `server/discover`. Earlier revisions negotiated once per connection with `initialize` and `notifications/initialized`, which is what most material written before mid-2026 shows.

## Authorization

Local stdio servers take credentials from their environment. Remote HTTP servers use **OAuth 2.1**: the MCP server is a *resource server*, it publishes **Protected Resource Metadata** pointing to its authorization server, the client obtains a token for that specific server (the `resource` parameter binds the token's audience), and sends it as a bearer token on every request. Two rules prevent classic attacks: a server must accept only tokens issued for itself, and it must never pass a client's token through to upstream APIs (the *confused deputy* problem); it uses its own credentials for those.

## Trust

An MCP server is code and text from a third party. Tool descriptions and results go straight into the model's context, so a malicious or compromised server can inject instructions, and a tool with write access can cause real damage. Treat servers like dependencies: install from trusted sources, pin versions, review what tools they expose, prefer read-only scopes, and keep a human approval step for destructive actions. Module 12 covers tool poisoning and supply-chain attacks.

> **Status as of October 2026:** MCP was introduced by Anthropic in November 2024 and has been hosted by the Agentic AI Foundation (AAIF) under the Linux Foundation since December 2025. The current specification revision is **2026-07-28** (stateless requests, `server/discover`, sampling, roots and logging deprecated, Client ID Metadata Documents preferred over Dynamic Client Registration); the previous one, `2025-11-25`, is still widely deployed. Official SDKs exist for TypeScript, Python, C#, Go, Rust, Ruby (tier 1), Java (tier 2), Swift, PHP and Kotlin, and each adopts new revisions on its own schedule.

## When to choose it

Use MCP when tools or data must be reachable from more than one AI application, when a vendor already ships a server for the system you need, or when the team that owns a system should own its AI integration too. Stay with plain function calling for tools that live inside one application and change with it. Use resources and prompts when the host or the user, not the model, should decide what enters the context.
