# Checkpoint: the Governance ADR

This module built the pieces of governance one at a time: an inventory with owners, identity and runtime policy for agents, data and model gates, cost controls, and a regulatory map. The checkpoint assembles them into a **governance plan** for one company: every layer with an owner, its controls, where each control is enforced and what evidence it leaves, plus the obligations per market. The ADR records why this plan and not the alternatives someone will propose next quarter.

A governance ADR is not "we adopted an AI policy". It is a set of enforceable decisions, each traceable to a finding, a policy or a law in the briefing.

## The decision checklist

1. **Findings to controls.** Start from what went wrong: orphaned agents, shared keys, shadow AI, overspend, rubber-stamp approvals. Each finding needs at least one control that would have prevented or detected it.
2. **Owners.** Every layer gets a person or team that can act. Audit stays independent of the teams it audits; data belongs to the data protection officer; regulation to legal.
3. **Enforcement points.** Runtime (gateway, harness) for anything that happens per call, CI for changes, process for judgment, and evidence for each. A layer enforced only by process should be the exception you can justify.
4. **Numbers from the briefing.** Credential lifetimes, retention, audit frequency, log retention, review volumes, budgets and migration dates are policies, not defaults. Copy them; do not invent them.
5. **Meaningful oversight.** Where decisions affect people, size the review queue so a human can actually disagree, measure overrides, and give the affected person an appeal path.
6. **Regulatory map.** Per feature and market, the obligations with their source and status on today's date; bills as watch items; a review date.

| Option | Buys | Costs |
| --- | --- | --- |
| Policy document plus training | quick, cheap | no enforcement, no evidence: policy theater |
| Bans on external AI tools | looks decisive | shadow AI moves out of sight unless a sanctioned tool exists |
| Runtime enforcement at gateway and harness | every call checked and logged | critical shared components to build and operate |
| Full automation of consequential decisions | speed, lower cost | loses the human review path that laws require and customers expect |

## Writing the ADR well

- **Context** names the forces with numbers: the findings, the markets and dates, the policies and the budget.
- **Decision** is one "We will" sentence that names the main mechanisms: registry and identity, runtime policy and audit, data and model gates, budgets, oversight, regulatory map.
- **Alternatives** are the ones that will come back ("just write a policy", "ban the tools", "automate small decisions"), each with the fact that rules it out.
- **Consequences** are honest: review capacity costs analysts, the gateway becomes critical infrastructure, the map needs quarterly work.

## Example: a small internal assistant

```ts
export const adr = {
  id: 13,
  title: 'Govern the HR assistant with an owner, a purpose gate and an audited policy point',
  status: 'accepted',
  layer: 'governance',
  context: 'An internal HR assistant answers policy questions for 400 employees in Brazil. It reads HR documents with personal data, and today it runs on a developer key with no owner or expiry, under the LGPD.',
  decision: 'We will register the assistant with the people team as owner, give it its own expiring identity, restrict retrieval to policy documents by purpose, and log every tool decision in a hash-chained log.',
  alternatives: [{ option: 'Let it read all HR files', reason: 'Policy answers never need salaries or medical leave records, so broad access only adds risk.' }],
  consequences: { positive: ['Every answer is attributable and its sources are auditable.'], negative: ['New document types need a purpose review before the assistant can use them.'] },
};
```

## Pitfalls

- Layers owned by "everyone" or by a committee with no members.
- Controls with no evidence: if nobody can show it ran, it did not.
- Numbers chosen for comfort instead of copied from policy.
- A regulatory map that treats bills as law, or ignores the markets of an upcoming launch.
- An audit function that reports to the team it audits.

Recheck the regulatory facts you use in this briefing whenever you reuse this ADR.

## When to choose it

Write the governance ADR before AI features reach customers in a new market, after an audit or incident, and whenever a new class of AI asset appears (agents acting for customers, models you fine-tune, decisions about people). Supersede it when the regulatory map changes materially, so the record shows what the company decided, under which law, at which date.
