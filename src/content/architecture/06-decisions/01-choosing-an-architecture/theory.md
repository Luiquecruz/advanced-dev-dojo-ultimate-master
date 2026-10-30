## Context first, then architecture

Every previous module answered one layer: where it renders, how code is organized, where state lives, how teams and deploys scale. Choosing an architecture means combining one answer per layer **for this product, this team and this traffic**. A good choice is justified by context ("prices change every hour and pages must rank"), never by fashion ("everyone uses micro-frontends").

## A decision guide by context

| Context | Suggested architecture |
| --- | --- |
| Landing page or institutional site that rarely changes | Static pages or SSG |
| Blog, documentation, marketing | SSG (ISR when content comes from a CMS) |
| Large catalog with prices or stock changing during the day | ISR with on-demand revalidation |
| Legacy server-rendered system (MVC) | Keep MVC, add React islands, migrate route by route |
| Internal product or dashboard | SPA + feature-based organization + TanStack Query |
| Public site with SEO and per-user data | SSR or Server Components (Next.js, React Router) + feature-based |
| Several clients (web, mobile, TV) on the same microservices | A BFF per client |
| Many teams on the same product | Modular monolith + monorepo + design system, then evaluate micro-frontends |
| Teams with independent deploys and decoupled domains | Micro-frontends |
| Complex business rules | Domain separated from React (hexagonal / clean) |
| Composable e-commerce | Next.js or Hydrogen + headless backends + BFF |

The table is a starting point. Each row is the **simplest option that satisfies the dominant quality attribute** of that context.

## Decide per route, per layer

Real products are not one row of the table. A store has a marketing home, a catalog, a cart, a checkout and an account area, and they have different needs:

```jsx
const routes = [
  { path: '/', rendering: 'SSG', reason: 'marketing copy, changes weekly' },
  { path: '/products/:id', rendering: 'ISR on demand', reason: 'SEO, price updates from the ERP' },
  { path: '/search', rendering: 'SSR', reason: 'query-dependent, must be indexable' },
  { path: '/account/*', rendering: 'SPA', reason: 'behind login, highly interactive' },
];
```

Rendering is chosen **per route**, driven by how often the data changes and whether it must be indexed. Organization is chosen **per module** (a simple settings feature does not need a hexagonal domain; pricing rules might). State is chosen **per kind of state** (server cache, URL, form, UI). Scale is chosen **per organization**, and changes slowly.

## A repeatable process

1. Write the briefing in one paragraph: users, SEO needs, data freshness, number of teams, deploy cadence, business complexity.
2. Rank the quality attributes.
3. For each layer, pick the simplest option that satisfies the top attributes. Prefer the defaults (SPA or framework defaults, feature folders, local state + server cache, one deploy) unless a requirement rules them out.
4. Record each non-obvious decision as an ADR, including what you deliberately left out.
5. Build a walking skeleton that exercises every layer end to end before adding features.
6. Revisit when a ranked attribute starts to hurt, not before.

## Reading a briefing

> "B2B ordering portal. 300 customers log in daily, no SEO. Pricing has many contract rules. One team of six. Weekly releases."

- Rendering: SPA (behind login, no SEO).
- Organization: feature-based, with a hexagonal domain **only** for pricing rules.
- State: TanStack Query for orders and catalog, URL for filters.
- Scale: single repo, single deploy. Micro-frontends would add cost for a problem this team does not have.

## Pitfalls

- Choosing one rendering model for every route.
- Copying the architecture of a company with 100 times your team size.
- Letting a framework default answer a question it was not designed for.
- Treating the table as rules instead of a summary of trade-offs.

## When to choose it

Use this guide at the start of a product, when a new area with different needs appears (a public catalog inside an internal tool), and during architecture reviews. Each time, go back to the context: who the users are, how fresh the data must be, how many teams ship, and how complex the rules are.
