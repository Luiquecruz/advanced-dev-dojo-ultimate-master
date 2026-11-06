# Inventory and Sprawl

You cannot govern what you cannot list. The first question in any AI audit, incident or regulatory request is "which AI systems do you run, who owns them, and what can they reach?". In most companies the honest answer is often "we are not sure": agents built for pilots still run, keys were pasted into CI variables, three teams use three MCP servers for the same database, and some people use tools nobody approved. That is **AI sprawl**, and the cure starts with an inventory.

## What goes in the registry

Register every asset that can act, decide or spend:

| Kind | Examples | Why it matters |
| --- | --- | --- |
| Model | `acme-small-2026-05`, a fine-tuned classifier | approval, license, deprecation (lesson 06) |
| Agent | support assistant, nightly maintenance agent | permissions, identity, blast radius (lesson 04) |
| Prompt | versioned system prompts from Prompts as Code | behavior changes, review |
| MCP server | internal docs server, a vendor's CRM server | which data and actions it exposes |
| API key or credential | gateway keys, OAuth grants, service tokens | who can spend and act, and until when |

Each record needs at least an **id**, a **kind**, a **name**, an **owner** (a person or team that answers for it), **dates** (created, last used, expires, retired) and, as the registry matures, links: which agent uses which key, prompt, model and servers. Some teams publish this as an **AI bill of materials** (AI-BOM) per product.

Two rules make the registry useful instead of decorative:

1. **No owner, no registration.** An asset with a blank owner is already orphaned.
2. **Every credential expires.** A key with no expiry date outlives its purpose, its owner and sometimes the company's memory of it.

## Lifecycle: register, review, retire

Assets move through a lifecycle: registered, active, transferred when the owner changes teams, and **retired** when the pilot ends. Retiring is a recorded state, not a deletion: the audit trail must still explain what the asset did. After retirement, any traffic that still uses the asset is a signal worth investigating.

## Finding problems automatically

A registry pays off when a job checks it on a schedule:

- **Orphaned assets:** join owners against the HR or identity directory. An owner who left means nobody will rotate the key, answer the incident or turn the agent off.
- **Expired and expiring credentials:** expired keys that still exist are clutter at best and a breach path at worst; expiring ones need rotation before they break production at 3 a.m.
- **Stale assets:** a key or agent unused for 90 days is probably a forgotten pilot. Stale credentials are favorite targets because nobody notices their use.

Inject `now` into these checks: the same code then runs in tests, in a nightly job and when you backfill historical data for an auditor.

## Shadow AI signals

The registry also tells you what is **not** sanctioned. Compare observed usage with it:

- **Gateway and proxy logs:** a key, model or agent id that is not registered, or traffic through a retired key.
- **Egress and DNS logs:** calls to AI provider domains from laptops or services that should not make them.
- **Identity provider:** OAuth grants to AI apps, especially with broad mail or drive scopes.
- **Expenses and procurement:** personal subscriptions to AI tools reimbursed as "software".

Aggregate signals by value (which key, model or agent), with call counts, token volume and sources, so the team knows which conversation to have first. And have that conversation: shadow AI usually means the sanctioned path is missing or too slow, so the response is "here is the approved way to do this" more often than a block.

## Pitfalls

- A spreadsheet inventory updated once a year: stale the day after the review.
- Registering assets without owners, or with a team alias nobody reads.
- Deleting retired assets instead of marking them, losing the audit trail.
- Treating every unregistered call as misconduct; most are people working around a missing tool.
- Logging prompt contents to detect shadow AI: detect with metadata (keys, models, sources, volumes), not by reading what people wrote.

"Agent sprawl" is an `emerging` term; "shadow AI" is `established`.

## When to choose it

Start the registry when the second AI asset appears, not the fiftieth: registering ten assets takes an afternoon, reconstructing two hundred takes a quarter. Run the audit on a schedule (nightly or weekly) and route findings to owners. Add shadow AI detection once a gateway or proxy sees most traffic; before that, ask teams what they use and make the sanctioned path easy.
