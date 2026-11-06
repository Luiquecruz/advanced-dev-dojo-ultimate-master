# Map: Governance in Layers

Module 12 asked how an attacker could turn your AI system against you. This module asks what every auditor, regulator, customer and finance team asks next: **who may do what with which AI, and how do you prove it?** Governance is not one policy document. It is a stack of controls, each with an owner, each enforced somewhere, each leaving evidence.

> This module teaches engineering for governance and summarizes laws so you can design for them. It is not legal advice: confirm obligations for your product with counsel in each jurisdiction.

## The question and the layer

This module is **layer 6, governance** of the track's six layers. It sits on top of everything before it: the harness controls of module 08 (permissions, hooks, audit) and the security controls of module 12 become governance controls once they have an owner, a policy behind them and a record that they ran. The 2026 shift is from **policy documents to runtime enforcement**: a rule that no code checks is a wish.

| You decide | Options | The lesson |
| --- | --- | --- |
| Which governance layers exist and who owns each | organizational, regulatory, data, model, agent identity, application, cost, engineering, audit | 02 |
| What AI exists in the company and who owns it | registry with owners, credential expiry, shadow AI signals | 03 |
| What each agent may do, on whose behalf | identity per agent, policy decision per tool call, hash-chained audit | 04 |
| What data may reach a model, for which purpose | classification, consent and purpose checks, minimization, retention | 05 |
| Which model versions are approved | registry, eval-gated promotion, pinning, deprecation | 06 |
| How much AI may cost, and who pays | budgets per team and feature, alerts, hard limits, rate limits | 07 |
| What the law expects, in principle | risk tiers, transparency, oversight, data protection, accountability | 08 |
| The most detailed horizontal law | EU AI Act, its dates and the Digital Omnibus changes | 09 |
| What already binds AI in Brazil | LGPD, ANPD, PL 2338/2023 and what is not law yet | 10 |
| Which obligations apply to a product, per jurisdiction | a dated rules table mapped to features | 11 |

## Prerequisites

- **Module 08:** permission policies, hooks and audit hooks. Lesson 04 turns the permission check into a policy decision point with agent identity.
- **Module 10:** evals and regression gates. Lesson 06 makes promotion of a model version depend on them.
- **Module 01:** tokens, cost and latency. Lesson 07 turns per-call cost into budgets and attribution.
- **Module 12:** least privilege and secrets. Identity and credentials here are the organizational side of the same controls.

## The path

1. **Governance layers** (quiz). The nine layers, their owners and controls; shadow AI, AI sprawl, policy theater and rubber-stamp oversight.
2. **Inventory and sprawl.** You build an AI asset registry with owners, and an audit that finds orphaned assets, expiring credentials and unregistered usage.
3. **Agent identity and runtime policy.** You build a policy decision point for every tool call and an append-only, hash-chained audit log.
4. **Data governance for AI.** You check purpose and consent before a model call, minimize fields and enforce retention.
5. **Model governance.** You build a model registry with pinned versions, eval-gated promotion, deprecation warnings and rollback.
6. **Cost governance.** You build budgets per team and feature, alerts, hard limits, rate limits and attribution.
7. **Regulation principles** (quiz). The ideas every AI law shares, and the standards that operationalize them.
8. **The EU AI Act** (quiz). Risk tiers, roles, general-purpose models, transparency and the current dates.
9. **Brazil: LGPD and PL 2338** (quiz). What already binds AI, what ANPD watches, and the status of the AI bill.
10. **The global regulatory map.** You map a product's features to obligations per market from a dated rules table.
11. **The governance ADR.** You write the governance plan for a fintech launching AI in Brazil and Portugal.

## The thread through the module

Every control in this module has the same four parts: **an owner** (a person or team, never "everyone"), **a rule** (written precisely enough for code to check), **enforcement** (where the rule runs: gateway, harness, CI, release process) and **evidence** (the log, eval record or report that shows it ran). If one of the four is missing, you have policy theater. Regulation adds a fifth part, **dates**: obligations change every quarter, so laws live in dated tables reviewed on a schedule, never in code paths nobody revisits.

Regulatory dates and thresholds change, so keep them in a table with an owner and a review schedule rather than in code, and confirm them against the official text before a compliance decision.

## When to choose it

Take this module before AI leaves the pilot stage: when a second team builds an agent, when customer data reaches a model, when the AI bill reaches finance, or when you sell into the EU or Brazil. A single internal prototype needs lessons 03 and 07 at most. Anything with customers, personal data or consequential decisions needs the whole path, and the ADR before launch rather than after the first audit request.
