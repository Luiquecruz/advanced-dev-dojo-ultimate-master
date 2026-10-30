## Checkpoint: the rendering decision

This module walked the timeline from static files to Server Components. Each model answers three questions differently: **where** the HTML is produced, **when** it is produced and **how much JavaScript** reaches the browser. The checkpoint turns that knowledge into the first entry of your portfolio: an Architecture Decision Record (module 01) for the rendering layer of a concrete product.

The rendering ADR is rarely "we use SSR". It is a **per-route map** plus the reasons behind it, written so that a new teammate understands why the help center is prebuilt and the checkout is not.

## The decision checklist

Ask these questions for every route, in this order:

1. **SEO and sharing**: must crawlers and link previews see the content without running JavaScript?
2. **Personalization**: is the HTML the same for every visitor, or does it depend on the user?
3. **Freshness**: how stale may the data be? Never, minutes, or until the next deploy?
4. **Cost and scale**: how often is the route requested, and what does a render cost there?

| Model | Buys | Costs |
| --- | --- | --- |
| Static pages | Zero runtime, CDN only | Every change is manual, no dynamic data |
| SSG | Prebuilt HTML on a CDN, minimal TTFB | Data frozen until the next build, build time grows with pages |
| ISR | SSG speed with data refreshed in the background or on demand | A stale window, the first visitor after expiry sees the old version |
| SSR | Fresh, personalized HTML with SEO | A server render on every request, higher TTFB, hydration |
| SPA | Instant navigation, simple hosting, clear API boundary | Blank screen until JavaScript runs, weak SEO, large bundles |

Islands and Server Components are refinements **inside** a route: they decide how much of an SSR or SSG page hydrates. Mention them in the reason of a route when they matter.

Two rules catch most mistakes: an SEO-critical route cannot be a SPA, and per-user HTML cannot be served from a shared cache (static, SSG or ISR).

## Writing the ADR well

- **Context** lists the forces, not the solution: share of traffic from search, how often each kind of data changes, budget, team size, hosting. Write it so a reader could disagree with the decision using the same facts.
- **Decision** is one sentence in active voice ("We will...") with its **scope**: which routes, which model. The per-route table lives next to it.
- **Alternatives** are the options you really considered (one model everywhere is always one of them) and the **reason** each was rejected, tied to a fact from the context.
- **Consequences** have two columns. Positive: what the team gains. Negative: what it now pays or must remember, such as "prices can be one minute stale, so the server re-checks them at payment".

## Example: a developer documentation portal

```js
export const adr = {
  id: 3,
  title: 'Render the developer portal per route',
  status: 'accepted',
  layer: 'rendering',
  context:
    'Docs bring 80% of sign-ups through search. Guides change on deploy, the changelog is published from a CMS a few times a week, and the API key dashboard is private and per user.',
  decision:
    'We will prebuild guides with SSG, serve the changelog with ISR revalidated by the CMS webhook, and ship the dashboard as a SPA behind login.',
  alternatives: [
    { option: 'SSR everywhere', reason: 'Pays a render per request for guides that only change on deploy.' },
    { option: 'SPA everywhere', reason: 'Guides would be invisible to search, our main acquisition channel.' },
  ],
  consequences: {
    positive: ['Guides and changelog are served from the CDN with a low TTFB.'],
    negative: ['Two delivery modes to build, test and monitor.'],
  },
};
```

Note how every rejected alternative points back to a sentence of the context. That link is what makes the record useful when someone proposes "let's just SSR everything" a year later.

## Pitfalls

- Choosing one model for the whole app because the framework defaults to it.
- A context that already argues for the decision instead of describing the forces.
- Only positive consequences. The stale window of ISR and the hydration cost of SSR belong in the record.
- Forgetting the "why" per route; the map without reasons cannot be revisited.

## When to choose it

Write a rendering ADR when a product starts, when a new kind of route appears (a public catalog next to a private dashboard), and when a measured pain (TTFB, LCP, infrastructure bill, stale prices) makes the current choice questionable. Supersede it rather than editing it when the map changes.
