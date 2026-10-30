## Requirements you cannot see in a ticket

A ticket says "show the product list". It rarely says "the list must appear in under one second on a mid-range phone, rank on Google, be changed safely by three teams and cost less than the current hosting". Those unwritten requirements are **quality attributes** (also called non-functional requirements), and they are what architecture decisions are judged against.

The attributes that matter most for a React frontend:

| Attribute | Question it asks | Typical signals |
| --- | --- | --- |
| Performance | How fast does the user see and use the page? | LCP, INP, CLS, bundle size, time to interactive |
| SEO and shareability | Can crawlers and link previews read the content? | content present in the initial HTML, stable URLs, meta tags |
| Maintainability | How cheap is the next change? | blast radius of a change, coupling, onboarding time |
| Testability | Can behavior be verified without the whole system? | pure domain logic, injectable dependencies, fast tests |
| Team autonomy | Can a team ship without waiting for another? | clear ownership, independent builds or deploys, few merge conflicts |
| Infrastructure cost | What does it cost to run and operate? | servers vs CDN, compute per request, number of pipelines |

Others appear depending on the product: accessibility, availability, security, offline support, time to market.

## Every decision is a trade

No option maximizes every attribute. Each decision **buys** some attributes with others:

- **SPA (client-side rendering)**: cheap to host (static files on a CDN), very interactive after load; pays with first-load performance and SEO.
- **SSR on every request**: fresh HTML with real content (SEO, fast first paint); pays with server compute, operational complexity and a hydration cost on the client.
- **SSG**: the fastest and cheapest delivery; pays with data freshness and build times on large sites.
- **Micro-frontends**: independent deploys and team autonomy; pays with duplicated dependencies, harder consistency and more infrastructure.
- **Hexagonal domain layer**: testability and framework independence; pays with more files and indirection.

```jsx
function ProductPage({ product }) {
  return <h1>{product.name}</h1>;
}
```

The same component can be rendered in the browser, per request on a server, or once at build time. The component did not change; the trade-off did.

## Making trade-offs explicit

A practical method used in architecture reviews:

1. List the attributes that matter for **this** product and rank them. A checkout ranks performance and correctness high; an internal admin tool ranks time to market and maintainability high and ignores SEO.
2. For each candidate option, note which attributes it improves and which it hurts.
3. Choose the option that wins on the top-ranked attributes, and **write down what you gave up**. The cost does not disappear because nobody mentioned it.

Ranking forces a conversation. "Fast, cheap, SEO-friendly and infinitely scalable" is not a ranking.

## Scenarios

- **Public product pages, SEO matters, prices change hourly.** Content must be in the HTML (rules out pure SPA), freshness matters (pure SSG gets stale): ISR or SSR with caching.
- **Internal dashboard for 40 employees.** No SEO, users stay for hours, so first-load cost is amortized: a SPA is the cheapest correct choice.
- **Six teams on one product and release trains that keep slipping.** The pain is team autonomy, not performance: module boundaries and ownership first, then consider independent deploys.

## Pitfalls

- Optimizing an attribute nobody ranked (sub-second SSR for a page behind login).
- Treating cost as someone else's problem: a server per request is a monthly bill and an on-call rotation.
- Measuring nothing: claims about performance without LCP or INP numbers are opinions.
- Forgetting that maintainability and testability are attributes too, and usually the ones that decide whether a codebase survives five years.

## When to choose it

Rank quality attributes before choosing any architecture, and revisit the ranking when the product changes (a tool that becomes public suddenly cares about SEO). When two options look equivalent, pick the one that is cheaper to reverse. When the top attribute is not hurting yet, prefer the simplest option and measure.
