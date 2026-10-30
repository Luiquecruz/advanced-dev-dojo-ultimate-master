## From prose to facts

A briefing arrives as prose: "A marketplace where sellers list products, buyers search and pay. Product pages must rank. Prices change every hour. Four teams, each wants to ship on its own schedule. Web and a mobile app." Before any architecture appears, turn it into **facts** that each layer can read:

```js
const briefing = {
  product: 'Marketplace',
  seo: true,
  personalized: false,
  dataChangesEvery: 'hour',
  teams: 4,
  independentDeploys: true,
  clients: ['web', 'mobile'],
  complexDomainRules: true,
  routes: [
    { path: '/products/:id' },
    { path: '/search', dataChangesEvery: 'request' },
    { path: '/checkout', seo: false, personalized: true },
  ],
};
```

Writing facts forces the questions people skip in a meeting: is this route really indexed? Is the HTML the same for every visitor? How stale may the data be? Do the teams actually need to deploy separately, or do they just want to?

## Which fact drives which layer

| Layer | Facts it reads | Options, simplest first |
| --- | --- | --- |
| Rendering (per route) | SEO, personalization, data freshness | SPA or static → SSG → ISR → SSR |
| Code organization | number of teams, independent deploys | feature folders → modular monolith → micro-frontends |
| Domain | complexity of business rules | logic in components and hooks → hexagonal domain |
| State and data | the rendering of each route | local state, plus a server cache for client-rendered routes and embedded data for server-rendered ones |
| Scale across clients | kinds of client | one API → a BFF per client |

Each row is the decision guide of the previous lessons condensed into conditions. Notice the direction: you start at the **simplest** option and move right only when a fact demands it. "Several teams" alone does not justify micro-frontends; "several teams **and** independent deploys" might. One web client does not need a BFF per client; web plus mobile with different payload shapes does.

## Rendering is a per-route question

Rules for rendering read the route, not the product:

- No indexing (behind login, an admin, a checkout) → the browser can render it: SPA.
- Indexed and different for every user → it must render per request: SSR.
- Indexed and shared → freshness decides: never changes → static HTML, daily → SSG, hourly → ISR, every request → SSR.

Most routes inherit the product's answers, so a route only lists what differs (`/checkout` is not indexed). Resolving routes against the briefing first keeps the rules simple and uniform.

## State follows rendering

Once rendering is decided, the state homes are almost forced. Client-rendered routes fetch server data in the browser, so they need a **server cache** (TanStack Query). Server-rendered routes fetch on the server and **embed** the data in the HTML for hydration. UI state (open panels, filters being typed) stays **local**. A global client store is not a default: it needs a fact, such as several features editing the same client data.

## Every decision carries its reason

A decision without a reason cannot be reviewed, and it cannot be revisited when the context changes. Produce them together:

```js
'/products/:id: isr because it must be indexed, is shared by every visitor and its data changes hourly'
'organization: micro-frontends because 4 teams need independent deploys'
```

These lines are the seeds of ADRs: the subject becomes the title, the facts become the context, the choice the decision. The next lesson turns them into a full set of ADRs next to a walking skeleton.

## Rules are a starting point

A rule set like this is a **checklist for a conversation**, not an oracle. It is deliberately coarse: it ignores budget, existing systems, team skills and compliance. Its value is that it makes the default explicit and forces every deviation to name the fact that justifies it. When the rule's answer feels wrong, the briefing is usually missing a fact; add it instead of overriding the answer silently.

## Pitfalls

- Deciding for the whole product when routes have different needs.
- Reading wishes as facts ("the team would like independent deploys").
- Jumping to the strongest option "to be safe", which turns into permanent cost.
- Writing reasons that would fit any product ("best practice", "scalable").

## When to choose it

Use an explicit briefing-to-decisions pass at the start of every product, whenever a new area with different needs appears, and in architecture reviews. Write the facts first, apply the simplest option per layer, attach a reason to each choice and only then open the editor. Revisit the decisions when a fact changes (a second team, a mobile app, a new SEO requirement), not when a new tool becomes popular.
