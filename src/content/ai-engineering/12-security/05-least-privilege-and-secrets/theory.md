# Least Privilege and Secrets

Assume the injection succeeds (lesson 02). The damage is then bounded by one thing: **what the hijacked agent's tools are allowed to do.** An agent holding an admin token turns every injection into an admin incident. An agent holding a read-only token for one customer, valid for thirty seconds, turns the same injection into a nuisance. Least privilege is the cheapest security control in this module, and the one most often skipped because a broad key "just works" in the demo.

## Who is the agent acting as?

Classic least privilege asks what a *user* may do. Agents add a twist: the agent acts **on behalf of** someone, through tools that hold credentials. Two failures repeat:

- **Excessive agency** (OWASP LLM06:2025, LLM03 in the 2026 edition): the tool can do more than the feature needs (a "read customer" tool backed by a key that can also delete customers), or the agent has tools it never needs.
- **The confused deputy:** the agent holds rights the requesting user does not have, and an attacker borrows them through injection. A support agent with a CRM-wide key answers one customer's question by reading another customer's record because a ticket asked it to.

The fix is the same in both cases: derive each tool call's rights from the **task and the requester**, not from what the integration happened to be configured with.

## Scoped, short-lived credentials per call

Instead of one long-lived key in an environment variable, a **credential broker** in the harness issues a fresh credential for each tool call:

| Property | Why |
| --- | --- |
| **Scoped** to the scopes this tool needs (`crm:read`, not `crm:*`) | a hijacked call cannot exceed the tool's purpose |
| **Bound** to one tool (and, in real systems, one audience or resource) | a token leaked from one tool is useless at another |
| **Short-lived** (seconds to minutes) and **revoked** after the call | a leaked token expires before anyone can use it |
| **Logged** with tool, scopes and arguments | the audit trail shows exactly what each call could do |

In production the broker is your identity provider: OAuth 2.0 token exchange (RFC 8693) turns a user's token into a narrower one for a downstream API, cloud providers issue temporary credentials from a role, and CI systems use OIDC federation instead of stored keys. MCP's authorization rules (module 03) follow the same idea: a token is issued for one specific server, and a server must never pass a client's token through to upstream APIs.

Expiry needs a clock you control: `now()` injected, `expiresAt = issuedAt + ttl`, and a credential is expired **at** `expiresAt`, not one millisecond after. Off-by-one expiry bugs are how "five-minute" tokens live forever.

## Secrets never enter the context

Anything in the context window can come back out: in an answer, in a tool argument the model writes, in a trace your observability vendor stores (module 10), in a memory (module 06), in a summary. So secrets must not be in prompts, context files such as `AGENTS.md`, tool descriptions or retrieved documents, and tool results must not echo them.

The model still needs to say *which* credential a call uses. Give it **placeholders**:

```ts
// what the model writes
{ "customerId": "c-42", "apiKey": "{{secret:CRM_API_KEY}}" }
// what the tool receives, after the harness resolves it at the boundary
{ "customerId": "c-42", "apiKey": "crm_live_9f8e..." }
```

The harness resolves placeholders **only** for secrets granted to that tool, so an injection that asks `send_email` to use `{{secret:CRM_API_KEY}}` fails at the boundary. Better still, many setups never hand the secret to the tool code either: a proxy outside the sandbox adds the `Authorization` header to outbound requests, so neither the model nor the code it runs ever holds the value.

## Redact what comes back

Tools are written by people who log for debugging. A CRM client that prints its auth header, an error message that quotes the request, a stack trace with a connection string: each puts a secret into the next model call. A post-tool step (a hook, in module 08's terms) redacts every known secret before the result reaches the model or any log:

- the raw value, its **base64** form (Basic auth headers) and its **URL-encoded** form (query strings);
- the longest values first, so a secret that contains another is replaced whole;
- the short-lived credential of the call too.

Redaction is string matching, so it fails against transformations it does not know (a secret split across lines, hex-encoded, partially printed). Treat it as the last net under the real controls: tools that never return credentials, and credentials too narrow and short-lived to matter if they leak.

> **Status as of October 2026:** agent platforms increasingly issue per-agent identities and short-lived tokens, and coding-agent sandboxes inject credentials through egress proxies instead of environment variables. Identity for AI agents is an active standards area (OAuth extensions for agents, the NIST NCCoE agent identity project), with no single settled pattern yet; module 13 covers agent identity and governance.

## When to choose it

Apply scoped, short-lived credentials to every tool that touches a system of record, and placeholders plus redaction to every secret an agent's tools need. A long-lived broad key is acceptable only in a local prototype that reads no untrusted content. If you cannot narrow a credential (a legacy API with one all-powerful key), put a narrow service of your own in front of it and give the agent that service instead.
