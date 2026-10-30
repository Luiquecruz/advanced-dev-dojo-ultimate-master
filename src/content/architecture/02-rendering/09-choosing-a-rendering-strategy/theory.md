## One app, many strategies

Every model in this module solved a problem of the previous one and introduced a new cost. The good news: you do not pick one for the whole product. Modern frameworks (Next.js, React Router 7, Astro, TanStack Start) decide **per route**, so one store can mix all of them:

| Route | Strategy | Why |
| --- | --- | --- |
| `/`, `/pricing`, `/about` | SSG | Same for everyone, changes with deploys, must rank and load instantly |
| `/products/[id]` | ISR (time + on-demand) | Thousands of pages, shared by all visitors, prices change a few times a day |
| `/account/orders` | SSR | Personal, must be current, needs the session cookie |
| `/dashboard` | SPA (client rendering) | Behind login, highly interactive, no SEO, long sessions |
| `/blog/[slug]` | SSG or islands | Content first, a few widgets (comments, share) |

## The four questions per route

1. **Freshness**: how stale may the data be? Never (SSR or client fetch), minutes (ISR), until the next deploy (SSG).
2. **Personalization**: is the HTML the same for every visitor? Shared HTML can be cached on a CDN (static, SSG, ISR); per-user HTML cannot (SSR, or a cached shell plus client or streamed fragments).
3. **SEO and sharing**: must crawlers and link previews see the content without running JavaScript? Then the HTML must contain it (anything except a pure SPA).
4. **Cost and scale**: renders per request cost CPU on every visit (SSR, MVC); build time grows with pages (SSG); a CDN hit costs almost nothing (static, SSG, ISR hits).

Interactivity is a fifth axis: how much of the screen responds to input decides how much JavaScript you must hydrate.

## Core Web Vitals impact

- **TTFB** (time to first byte): lowest when HTML comes from a CDN (static, SSG, ISR). Higher with SSR, since the server renders and fetches first. Streaming SSR lowers the effective cost by flushing the shell early.
- **LCP** (largest contentful paint): good when the main content is in the initial HTML. A SPA has to download, parse and run its bundle and then fetch data before the LCP element exists, so LCP suffers on slow devices.
- **INP** (interaction to next paint): hurt by a busy main thread. Hydrating a large tree, or a large SPA bundle, delays the first responses. Islands and Server Components ship less JavaScript and help most here.
- **CLS** is mostly about layout (reserved space for images and late content), but client-fetched sections that pop in are a common cause in SPAs.

**Hydration cost** is the hidden tax of SSR, SSG and ISR: the page looks ready before it is interactive. The more of the page is plain content, the more you gain from islands or Server Components.

## The whole module side by side

| Model | HTML generated | JS to the client | Data freshness | Main cost |
| --- | --- | --- | --- | --- |
| Static pages | By hand, served as is | None or hand-written | Manual edits | Duplication, no dynamic data |
| MVC (server) | Server, per request | Small scripts | Always fresh | Full reload per navigation, server per request |
| SPA | Browser | Whole app | Fetched on the client | Blank page until JS, weak SEO, big bundle, waterfalls |
| SSR | Server, per request | Whole tree hydrates | Always fresh | Server per request, higher TTFB, hydration |
| SSG | Build time | Whole tree hydrates | Frozen until rebuild | Build time grows with pages |
| ISR | Build/first request, then in background | Whole tree hydrates | Stale within the window | Stale window, cross-page inconsistency, needs a platform |
| Islands | Build or request | Only the islands | Depends on host (SSG/SSR) | Islands share state awkwardly, MPA navigation |
| RSC | Server (build or request) + SSR | Only Client Components | Per route (static or dynamic) | Framework lock-in, new mental model, server waterfalls |

## Combining strategies inside a page

A route is rarely pure:

- An ISR product page with **client-fetched stock** and cart badge: cached shell, live fragments.
- A cached page with **streamed personalized sections** (Suspense in RSC, Next.js Partial Prerendering, Astro server islands).
- An SSG marketing page whose signup form is the only island.

## Pitfalls

- Choosing by fashion: SSR everywhere because "SEO", even for an admin panel no crawler can reach.
- Personalizing a cached page by accident: reading cookies in a page that is cached for everyone leaks one user's data to another, or silently turns the route dynamic.
- Ignoring the cost model: SSR on a route with heavy traffic and no personalization pays servers for work a CDN could absorb.
- Measuring in the lab only: use field data (Chrome UX Report, RUM) on real devices before and after changing a route's strategy.

## When to choose it

Start from each route's answers: shared and rarely changing → SSG; shared and changing → ISR or on-demand revalidation; personal or must be exact → SSR or client fetch; app-like behind login → SPA; mostly content with a few widgets → islands; a large React app that wants smaller bundles in one tree → RSC. Write the decision down (an ADR per strategy choice) and revisit it when traffic, data freshness or the team change.
