## Getting the HTML back without losing the SPA

The SPA gave instant navigation but a blank first screen and empty HTML for crawlers. **Server-side rendering (SSR)** runs the same React components on the server for the first request, sends real HTML, and then lets the client take over. Next.js, React Router 7 (framework mode, formerly Remix) and TanStack Start do this for you; this lesson builds the core by hand.

| Question | SSR |
| --- | --- |
| Where is the HTML generated? | On the server, and again in memory on the client during hydration |
| When? | On every request |
| How much JS reaches the client? | Everything the SPA shipped, plus the serialized data |

## The request, step by step

1. The server receives `/products`, loads the data (database, API).
2. It renders the tree to HTML: `renderToString(<App products={products} />)`.
3. It sends a full document with that HTML inside `#root`, the **serialized data**, and the bundle.
4. The browser paints the HTML immediately. The page is visible but not interactive.
5. The bundle loads and calls `hydrateRoot(container, <App products={products} />)`.
6. React renders the tree again in memory, walks the existing DOM, **adopts** its nodes and attaches event listeners.

```jsx
const html = `<!DOCTYPE html>
<html><body>
  <div id="root">${renderToString(<App products={products} />)}</div>
  <script id="__DATA__" type="application/json">${serializeData(products)}</script>
  <script type="module" src="/assets/client.js"></script>
</body></html>`;
```

## Why serialize the data

Hydration requires the client's first render to match the server HTML exactly. The client needs the **same props** the server used. Fetching them again would cost a second round trip, show a flash of empty content and risk getting different data. So the server embeds what it fetched, and the client reads it:

```jsx
const products = JSON.parse(document.getElementById('__DATA__').textContent);
hydrateRoot(container, <App products={products} />);
```

Frameworks do the same thing under other names (`__NEXT_DATA__`, the React Router loader data, TanStack Query's `dehydrate`).

**Security pitfall.** `JSON.stringify` does not escape HTML. If any value contains `</script>`, the HTML parser closes the script element there and runs whatever follows: a stored XSS from a product name. Replace `<` with `\u003c`; JSON still parses it as `<`, but the HTML parser never sees a tag. Libraries such as `serialize-javascript` or `devalue` also handle `\u2028` and non-JSON values.

## The metrics

- **TTFB** (time to first byte) gets worse than a static file: the server must fetch data and render before sending anything.
- **FCP / LCP** (first and largest contentful paint) get much better than a SPA: content is in the first response.
- **TTI / INP** (interactivity): the page looks ready before it is. Clicks during hydration do nothing (React 19 replays some events after hydration). Hydration re-executes every component, so a large page on a slow phone can block the main thread for a long time. This is the **hydration cost**: the client repeats work the server already did, just to attach listeners.

## Streaming

`renderToString` is synchronous: it cannot wait for data inside the tree and sends nothing until the whole page is ready. Streaming APIs fix TTFB: `renderToPipeableStream` (Node streams) and `renderToReadableStream` (Web Streams, edge runtimes) send the shell immediately and stream each `<Suspense>` boundary when its data resolves, with a tiny inline script that swaps the fallback for the content. Hydration is also split per boundary (selective hydration), and React prioritizes the part the user interacts with.

## Pitfalls

- **Hydration mismatches**: `Date.now()`, `Math.random()`, `window` or locale formatting that differ between server and client. Use `useId`, pass dates as data, read browser-only values in `useEffect`.
- Refetching on the client what the server already loaded.
- Server cost: every request runs React. Cache data and, where possible, whole responses (`Cache-Control: s-maxage` on a CDN).
- Browser APIs in module scope crash the server render.

## When to choose it

Choose SSR for pages that need fresh or personalized data **and** a fast first paint or SEO: e-commerce product and search pages, feeds, logged-in pages that must load quickly. Use a framework and stream with Suspense. If the data is the same for everyone and changes rarely, generating it once at build time (next lesson) is cheaper; if no one needs the first paint to be fast, a SPA is simpler.
