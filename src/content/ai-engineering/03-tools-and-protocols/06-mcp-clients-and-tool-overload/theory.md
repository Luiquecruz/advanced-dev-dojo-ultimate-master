# MCP Clients and Tool Overload

In MCP terms, the **host** is the application the user works in (an IDE agent, a chat app, your own agent), and it creates one **client** per **server** it connects to. The client lists the server's tools, turns them into tool definitions for the model, and sends `tools/call` when the model picks one. With one server, that is a thin adapter. With ten, three new problems appear: name collisions, routing, and a context window full of tool definitions.

## Discovery and routing

At startup (and whenever a server signals that its list changed), the client calls `tools/list` on every server. Lists are **paginated**: follow `nextCursor` until it is absent, or you will silently miss tools. List results carry `ttlMs`, so a client can cache them instead of listing on every turn.

Tool names are unique only inside one server. Two servers that both expose `search` collide in the model's tool list, so the client **namespaces** them, for example `crm__search` and `billing__search`, and keeps a map from the qualified name back to `(server, original name)`. The spec recommends exactly this kind of prefix and warns against using the server's self-reported name for it, because it is not guaranteed unique; use the identifier you configured. Keep qualified names within the usual limits (letters, digits, `_`, `-`, `.`; at most 64 or 128 characters, depending on the provider).

One failing server must not take the agent down. Record the failure, show it to the user or the logs, and keep working with the others.

## Tool overload

Every tool definition is sent with every request. A realistic setup with a few popular servers easily reaches dozens of tools and tens of thousands of tokens before the user has typed anything. Overload costs in three ways:

- **Tokens and latency** on every call, for definitions that are mostly unused.
- **Selection accuracy**: the more similar tools the model sees, the more often it picks the wrong one or invents arguments.
- **Attack surface**: every tool description is text from a third party that enters the context (module 12 covers tool poisoning).

The remedies, from simplest to most dynamic:

1. **Fewer, better tools.** Consolidate low-level tools into task-level ones (lesson 03) and disconnect servers the task does not need.
2. **Static subsets.** Give each agent or workflow step only its tools: the billing assistant does not need the CRM's write tools.
3. **Load on demand.** Keep a searchable **index** of all tools and expose one meta-tool, such as `search_tools`. The model describes what it needs, the client searches the index (by embeddings, keywords or both) and adds only the matching definitions to the next request, within a **token budget**.
4. **Code instead of calls.** Let the model write a short program that calls tools and returns only the final result, so intermediate data never enters the context. This needs a sandbox (module 08).

```text
turn 1  tools: [search_tools]                                  -> search_tools({ query: "refund an invoice" })
turn 2  tools: [search_tools, billing__refund_invoice, ...]    -> billing__refund_invoice({ invoice: "INV-1001", ... })
turn 3  tools: same                                            -> "Done: INV-1001 was refunded."
```

On-demand loading trades one extra round trip for a much smaller, more focused tool list. Keep the few tools used in almost every conversation **always loaded**, and keep the order of loaded definitions stable so prompt caching still works.

## Budgets

Measure tool definitions like any other context: count their tokens and give them a budget. A loader that respects the budget picks the best matches that fit and skips the rest, rather than overflowing the window or cutting a definition in half. The budget is also a design signal: if the five tools a task needs do not fit, the tools are too verbose.

## Pitfalls

- Reading only the first page of `tools/list`.
- Merging tools from several servers without namespacing, so one `search` shadows another.
- Routing by the server's self-reported name instead of your own configuration.
- Connecting every available server to every agent "just in case".
- Letting the model call a tool it was never offered: always check the name against what you loaded.

> **Status as of October 2026:** providers ship on-demand tool loading natively: Anthropic's API, for example, offers a tool search tool where definitions marked `defer_loading` are found by search and expanded only when needed, and reported that 58 tools from five common MCP servers took about 55 000 tokens before any conversation. MCP gateways and the AAIF-hosted agentgateway and Agent Router projects aggregate and filter servers for many clients. Measure your own setup: the numbers vary widely with the servers you connect.

## When to choose it

Write (or configure) a multi-server client when an agent needs capabilities owned by different teams or vendors. Below roughly ten to twenty well-described tools, send them all and keep the code simple. Above that, or when tools overlap, add namespacing and static subsets first, and move to search-based loading when even the subsets do not fit the budget or selection accuracy drops in your evals.
