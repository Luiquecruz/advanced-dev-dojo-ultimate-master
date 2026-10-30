## The most common architecture failure

Teams rarely fail because their architecture was too simple. They fail because they paid, upfront and every day, for complexity that solved a problem they did not have. Micro-frontends for a team of four, a monorepo with one app, a BFF that forwards requests unchanged, a hexagonal layer around a form that saves three fields.

**Micro-frontends, monorepos and BFFs solve organizational problems** (many teams, independent release cadences, many clients), not technical ones. Adopting them before the organizational problem exists buys nothing and costs a lot: more pipelines, more versions to align, more places for bugs to hide, slower onboarding.

## Anti-patterns to recognize

**Adopting before the problem.** "We will have ten teams one day" is not a requirement. Build a modular monolith with clear boundaries; it can be split later precisely because the boundaries exist.

**Distributed monolith.** Services or micro-frontends that must be deployed together, share a database or a global store, or break when a sibling changes. You pay the cost of distribution and keep the coupling of a monolith. The tell: a "small change" needs coordinated releases in three repositories.

**Global store for everything.** Server data, form drafts, modal flags and hover state in one store. Every change re-renders distant components, server data goes stale because nobody invalidates it, and tests need the whole store. Classify state instead: server cache, URL, form, local UI, and a small client store only for truly shared client state.

```jsx
const useAppStore = create(() => ({
  products: [],
  isProductsLoading: false,
  searchInput: '',
  isFilterDrawerOpen: false,
  hoveredRowId: null,
}));
```

Each field above has a better home: TanStack Query, local state, the URL, a component's `useState`.

**Premature abstractions.** A generic `DataTable` with 40 props built for one table, a `BaseService` class hierarchy for two endpoints, an adapter layer for a vendor you will never replace. Duplication is cheaper than the wrong abstraction. A common rule of thumb: wait for the third use case, then abstract what actually repeats (AHA: "avoid hasty abstractions").

**Resume-driven development.** Choosing technology because it looks good on a CV or a conference talk rather than because the context needs it. Ask: which ranked quality attribute does this improve, and what does it cost us?

**Layers without logic.** Hexagonal ports and adapters around CRUD screens, use cases that only call the repository, mappers that copy objects field by field. Indirection has to pay rent with real business rules or real replaceability.

## Simplicity criteria

Before adding a piece of architecture, check:

1. **Named problem.** Can you point to a current, measurable pain (build time, incidents, merge conflicts, LCP)?
2. **Ranked attribute.** Does it improve an attribute the team ranked high?
3. **Cost written down.** Is the operational, cognitive and onboarding cost in an ADR?
4. **Reversibility.** If it turns out wrong, how expensive is it to undo?
5. **Smallest step.** Is there a simpler option that solves 80% (a lint rule instead of a new repo, a folder boundary instead of a package)?

If the answers are vague, wait. Simple systems are easier to make complex later than the other way round.

## Under-engineering exists too

Simplicity is not the absence of decisions. A product with no boundaries, server data copied into `useState` everywhere and a single 3,000-line component is not simple, it is unmanaged. The goal is **nothing beyond what is necessary**, and what is necessary grows with the product.

## Pitfalls

- Confusing "scalable" with "complicated".
- Measuring architecture by the number of layers or packages.
- Keeping a costly piece of architecture after the reason for it disappeared (a team merged, a client app was retired).

## When to choose it

Apply these criteria in every design review and before every ADR that adds a moving part. Choose the modular monolith, local state plus a server cache, and per-route rendering by default; move to monorepos, BFFs or micro-frontends when teams, clients or deploy cadences actually demand it, and write down the trigger that justified the move.
