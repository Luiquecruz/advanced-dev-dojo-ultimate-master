## The cost SSR and SSG left on the table

SSR, SSG and ISR all send real HTML, but they then hydrate the **whole page**: the client downloads the code of every component, renders the full tree again in memory and attaches listeners everywhere. On a product page that is 95% text and images, the browser pays for the header, the description, the specs table and the footer, even though none of them ever responds to a click. Hydration cost grows with page size, not with interactivity, and it shows up as a slow **INP** and a busy main thread on mid-range phones.

**Islands architecture** (a term coined by Katie Sylor-Miller and popularized by Jason Miller) flips the default: the page is static HTML, and only the interactive widgets are **islands** that ship JavaScript and hydrate on their own.

| Question | Answer with islands |
| --- | --- |
| Where is the HTML generated? | On the server or at build time, for the whole page including the islands |
| When? | At build time (static) or per request, depending on the host framework |
| How much JS reaches the client? | Only the code of the islands on that page. Static parts ship **zero** JavaScript |

## How it works

1. The server renders the page. Static parts become plain HTML.
2. Each interactive component is also rendered to HTML (so it is visible before any JS), wrapped in a marker element that records **which component** it is and **which props** it received.
3. On the client, a small loader finds every marker and hydrates each one as an **independent root**. There is no app-wide React tree: two islands do not share state or context, and a crash in one does not take down the others.

```html
<article>
  <h1>Mechanical keyboard</h1>
  <p>A 75% board with hot-swappable switches.</p>
  <div data-island="Counter" data-props="{&quot;label&quot;:&quot;Likes&quot;,&quot;start&quot;:3}">
    <button>Likes: <!-- -->3</button>
  </div>
  <footer>Static footer</footer>
</article>
```

```jsx
for (const island of document.querySelectorAll('[data-island]')) {
  const Component = components[island.dataset.island];
  hydrateRoot(island, <Component {...JSON.parse(island.dataset.props)} />);
}
```

This is **partial hydration**: React runs only inside the islands. Props must survive the trip through HTML, so they have to be **serializable** (strings, numbers, booleans, arrays, plain objects). Functions, class instances and JSX children cannot cross unless the framework has a special mechanism for them, like Astro's slots.

## Astro with React

Astro is the best-known islands framework and supports React, Vue, Svelte and others side by side. Components render to HTML by default with no JavaScript; a `client:*` directive turns one into an island and decides **when** it hydrates:

```tsx
---
import AddToCart from '../components/AddToCart.jsx';
import Reviews from '../components/Reviews.jsx';
---
<h1>{product.name}</h1>
<AddToCart client:load productId={product.id} />
<Reviews client:visible productId={product.id} />
```

- `client:load` hydrates immediately, `client:idle` when the browser is idle, `client:visible` when the island scrolls into view, `client:media` on a media query, `client:only` skips server rendering.
- Astro wraps each island in an `<astro-island>` custom element that stores the component URL and serialized props, much like the `data-island` marker above.
- **Server islands** (`server:defer`) apply the same idea on the server: a personalized fragment is rendered later and streamed into an otherwise cached page.

## Pitfalls

- **Shared state between islands is hard by design.** A cart badge in the header and an "Add to cart" button in the body are two roots. Share through a tiny store outside React (nanostores, a module-level store, custom events, the URL), not through Context.
- **Too many islands become an SPA again.** If most of the page is interactive, islands add marker overhead without saving JavaScript. Dashboards and editors are better served by an SPA.
- **Navigation is a full page load** by default (a multi-page app). View transitions smooth it, but client state does not survive navigation unless it is persisted.
- **Props are serialized into the HTML.** Large props bloat the page and anything you pass is visible in the source: never pass secrets.
- **Hydration mismatches still apply** inside each island: same props and same render on both sides.

## When to choose it

Choose islands for content-first sites with a few interactive widgets: marketing pages, documentation, blogs, e-commerce product and category pages, news. They give SSG-like TTFB and the smallest JavaScript budget. Prefer an SPA or full SSR with hydration when most of the screen is interactive and shares state (dashboards, editors, chat), and consider React Server Components when you want a similar "zero JS by default" result inside a single React tree.
