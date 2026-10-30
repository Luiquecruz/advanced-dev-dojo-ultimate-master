## Checkpoint: the scale decision

The last module-level entry of your portfolio decides how the product is **split across teams and deploys**. This module walked the spectrum of deploy coupling: monolith, modular monolith, monorepo and micro-frontends, plus the Backend for Frontend, runtime composition, Web Components and Module Federation. Each step to the right buys team autonomy and pays with operational complexity.

The critical point of the module is that these are **organizational** answers. The ADR must therefore be grounded in organizational facts: how many teams, how often each needs to deploy, and how coupled their changes are. A scale ADR that cites only technology ("Module Federation is mature now") is the classic way to end up with a distributed monolith.

## The decision checklist

1. **How many teams, and do they own distinct domains?** One or two teams rarely need more than a modular monolith.
2. **What is the deploy cadence, and who blocks whom?** A shared release train that holds back urgent fixes is a real pain, but it may be solved by trunk-based development and feature flags before splitting deploys.
3. **How coupled are changes?** If a typical feature touches several domains, independent deploys turn every feature into a multi-team negotiation.
4. **Are lifecycles independent?** Different framework versions, an acquisition or a gradual rewrite are strong signals for a separate deployable.
5. **What is the cost you can operate?** Shared dependencies, routing, contracts, visual consistency, duplicated JavaScript and observability.

| Option | Buys | Costs |
| --- | --- | --- |
| Monolith | Simplest build, deploy and refactoring | No boundaries; grows into a big ball of mud |
| Modular monolith | Code autonomy, ownership per module, one deploy | Discipline and a boundary checker |
| Monorepo (many apps and packages) | Shared packages, cached builds, separate apps | Tooling and versioning of internal packages |
| Micro-frontends | Independent deploys and lifecycles per team | Runtime contracts, shared dependencies, consistency, performance |

## Writing the ADR well

- **Context**: team count, domains, deploy cadence and the concrete incident (a blocked release, a slow build), plus the share of changes that stay inside one domain.
- **Decision**: one "We will..." sentence naming the topology and how boundaries and ownership are enforced (public APIs, `CODEOWNERS`, an architecture test).
- **Alternatives**: always include micro-frontends, and reject or justify them **with the numbers from the context**: team count and deploy cadence.
- **Consequences**: positive and negative, plus **revisit triggers**: the measurable signals that would justify moving one step to the right. They turn "not now" into "not until X".

## Example: an online bank

```js
export const adr = {
  id: 11,
  title: 'Extract only the mortgage flow as a micro-frontend',
  status: 'accepted',
  layer: 'scale',
  context:
    'Nine teams work on one modular monolith deployed daily. The mortgage flow came from an acquisition, runs React 17 and must be released on the regulator schedule.',
  decision:
    'We will keep the modular monolith and mount the mortgage flow as a micro-frontend at /mortgage through a mount and unmount contract.',
  alternatives: [
    { option: 'Rewrite mortgage inside the monolith', reason: 'A rewrite blocks regulated releases for two quarters.' },
    { option: 'Micro-frontends for every team', reason: 'Eight of the nine teams already deploy daily without blocking each other.' },
  ],
  consequences: {
    positive: ['Mortgage releases follow the regulator schedule.'],
    negative: ['Two React versions ship to the mortgage pages.'],
  },
  revisitWhen: ['The mortgage flow upgrades to the shared React version.'],
};
```

The same option, micro-frontends, is accepted for one domain and rejected for the rest, each time with a fact from the context.

## Pitfalls

- Adopting micro-frontends to fix a missing boundary problem; the modular monolith fixes that first.
- Splitting by technical layer ("header app", "forms app") instead of business domain.
- Rejecting micro-frontends without stating when the answer would change.
- Forgetting ownership: a module nobody owns is a shared folder again.

## When to choose it

Write the scale ADR when a second or third team joins, when releases start blocking each other, or when someone proposes micro-frontends or a monorepo. Revisit it when one of its triggers fires, and supersede it with a new record rather than editing it.
