## Checkpoint: the code organization decision

The rendering ADR said where and when HTML is produced. The second entry of your portfolio decides **where code lives and who may import whom**. This module covered folders by type versus by feature, public APIs, layered dependency rules (Feature-Sliced Design), hexagonal frontends, hooks over containers and atomic design. The checkpoint condenses them into one record that a team can enforce in CI.

A code organization ADR without an enforceable rule is a wish. The decision must name the **units** (features, entities, shared), the **direction** of dependencies and the **public API** each unit exposes, so that a lint rule or an architecture test can fail a pull request.

## The decision checklist

1. **What is the unit of change?** If most tickets touch one business capability, organize by feature, not by technical type.
2. **Which units are reused by several others?** Shared business concepts (a product, a user) go below the features that use them; domain-free code (buttons, an HTTP client) goes to `shared`.
3. **What is the dependency direction?** Layers import only downward; slices of the same layer do not import each other.
4. **What is public?** Each slice exposes one `index.js`; deep imports into another slice are violations.
5. **How is it enforced?** `eslint-plugin-boundaries`, `import/no-restricted-paths` or an architecture test, run in CI.
6. **Does the domain need isolation from React?** Complex rules may justify a hexagonal core with ports and adapters.

| Option | Buys | Costs |
| --- | --- | --- |
| By type (`components/`, `hooks/`) | Familiar, zero rules | Every feature is spread across folders, anything imports anything |
| Feature folders (Bulletproof React) | Code grouped by capability, no cross-feature imports | Needs a home for shared business concepts |
| Feature-Sliced Design layers | Explicit downward rule, standard vocabulary | More folders and naming decisions, learning curve |
| Hexagonal core | Business rules testable without React | Ports and adapters to write and keep in sync |
| Atomic design | A shared language for a design system | Says nothing about business boundaries; poor as an app structure |

## Writing the ADR well

- **Context**: the pain in numbers (files, incidents, onboarding time), team shape and what comes next (a modular monolith, a second app).
- **Decision**: one "We will..." sentence naming the structure, the dependency direction and the public API rule, followed by the layer table.
- **Alternatives**: usually "keep folders by type", "feature folders without layers" and "full hexagonal". Reject each with a fact from the context.
- **Consequences**: positive (local changes, enforceable boundaries, a path to modules) and negative (a migration, rules that block "quick" imports, debates about where a slice belongs).

## Example: a newsroom editor

```js
export const adr = {
  id: 7,
  title: 'Organize the editor by feature with downward imports',
  status: 'accepted',
  layer: 'code-organization',
  context:
    'Three developers maintain an article editor of 90 components grouped by type. A change to embeds broke publishing twice this month.',
  decision:
    'We will group code into features above entities and shared, import only downward and only through each slice public API (index.js), checked by eslint-plugin-boundaries in CI.',
  alternatives: [
    { option: 'Keep folders by type', reason: 'It is what produced the cross-feature breakages.' },
    { option: 'Hexagonal core for every feature', reason: 'Editing rules are simple; ports would be pure ceremony.' },
  ],
  consequences: {
    positive: ['A change to embeds stays inside features/embeds.'],
    negative: ['Moving 90 files and fixing imports takes about two sprints.'],
  },
};
```

## Pitfalls

- Placing a concept used by two features inside one of them; the other must then import a sibling.
- A public API that re-exports every internal file, which turns `index.js` into a deep import with extra steps.
- Rules written in the ADR but not in CI.
- Choosing atomic design as the application structure instead of a component taxonomy.

## When to choose it

Write this ADR before a codebase passes a few dozen components, when a second team joins, or when a change in one area keeps breaking another. It is also the prerequisite of the scale module: a modular monolith is this ADR plus ownership and module-level boundaries.
