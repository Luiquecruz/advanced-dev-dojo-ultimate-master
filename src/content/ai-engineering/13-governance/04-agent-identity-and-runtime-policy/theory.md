# Agent Identity and Runtime Policy

Module 08 decided which tool calls an agent may make with allow, ask and deny rules over commands and paths. That works for one agent on one repository. In a company with dozens of agents acting for customers and employees, governance needs two more things: knowing **which agent** made a call and **on whose behalf**, and deciding each call from **attributes** (who, what data, for what purpose) that one central policy can reason about. Then every decision must leave evidence that survives an audit.

## Identity per agent

Agents often start life with a developer's personal API key or one shared service account. Both break governance:

- **Attribution:** the log says "the key did it". You cannot tell the support agent's refund from the billing agent's.
- **Revocation:** suspending one misbehaving agent means rotating a key ten agents use.
- **Least privilege:** the shared key carries the union of every agent's permissions.

Give each agent its own **identity**, registered with an owner (lesson 03), and give it **short-lived, scoped credentials** issued for that identity. When the agent acts for a person, record the **delegation**: the user is the subject, the agent is the actor. OAuth token exchange (RFC 8693) expresses exactly this with an `act` claim; workload identity systems such as SPIFFE issue verifiable identities to services. Never let an agent borrow a human's full session.

## A decision point per tool call

The classic access-control architecture separates two roles:

- the **policy enforcement point (PEP)** sits on the path of every call (the gateway or the harness) and cannot be skipped;
- the **policy decision point (PDP)** receives the call's attributes and returns a decision.

The attributes are what make the policy readable:

| Attribute | Example | Question it answers |
| --- | --- | --- |
| Agent identity and risk tier | `billing-agent`, high | who is asking, and how much autonomy do we grant it |
| Tool scope and side effect | `refunds:write`, write | what the call can change |
| Data classification | restricted | how sensitive the data it touches is |
| Purpose | `billing` | why: the same data may be fine for support and not for marketing |
| On behalf of | `customer-4411` | whose rights and consent apply |

The decision is `allow`, `ask` (a human approves, as in Human-in-the-Loop) or `deny`, **with reasons**. Reasons turn a refusal into information: the model can choose another path, the reviewer sees why approval was requested, and the auditor sees which rule applied.

```ts
policy.decide({ agentId: 'reporting-agent', tool: 'issue_refund', purpose: 'billing' });
// { effect: 'deny', reasons: ['missing-scope', 'purpose-not-allowed', 'above-clearance'], ... }
```

Default to **deny**: an unknown agent, a suspended agent or an unknown tool never gets through. Keep a **kill switch** in the decision point itself, so suspending an agent takes effect on its next call, without a deploy. In production, policies usually live in a policy engine (OPA with Rego, Cedar, OpenFGA for relationships) and are versioned and tested like code.

## An audit log you can trust

Every decision, including denials and calls that never ran, goes into an **append-only log**. Append-only in code is not enough: whoever controls the database can edit a row. A **hash chain** makes tampering evident: each entry stores the hash of the previous entry, and its own hash covers its content and that link.

```text
entry n: { sequence, timestamp, event, previousHash: hash(n-1), hash: sha256([sequence, timestamp, previousHash, event]) }
```

Edit one event and its hash no longer matches; recompute that hash and the next entry's `previousHash` no longer matches; delete or reorder entries and the sequence breaks. A chain is **tamper-evident**, not tamper-proof: truncating the tail leaves a valid shorter chain, so periodically publish the latest hash somewhere the log's operator cannot rewrite (another system, a transparency log, a signed report).

Audit logs live for years and travel to auditors, so log what proves the decision without the data itself: identities, tool, purpose, effect, reasons and a **hash of the arguments**, which proves what was proposed if the original turns up, without storing an email address or a card number in the log.

## Pitfalls

- One service account for every agent.
- Policies that read the prompt ("the agent said it was authorized") instead of verified attributes.
- Fail-open decision points: a timeout must mean deny.
- Logging only allowed calls; denials are the evidence that the policy works.
- Raw arguments and outputs in the audit log.

> **Status as of October 2026:** MCP's authorization builds on OAuth 2.1, and its current specification revision is 2026-07-28. NIST's NCCoE runs a project on identity and authorization for software and AI agents, identity providers ship agent identities (for example Microsoft Entra Agent ID), and OWASP's Top 10 for Agentic Applications (2026) lists identity and privilege abuse among the main agent risks. Policy engines in common use include OPA, Cedar and OpenFGA.

## When to choose it

Give agents their own identities as soon as more than one agent exists or any agent acts for users. Put a decision point in front of every tool that touches personal data, money or external parties, and send every decision to a hash-chained log. A single read-only agent on public data can live with module 08's permission rules and an ordinary log.
