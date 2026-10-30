## The slowest query decides the whole page

Classic SSR has an all-or-nothing shape: the server loads **every** piece of data, renders the whole tree with `renderToString`, and only then sends the first byte. A page with a 20 ms product query and a 900 ms reviews service answers after 900 ms, though the header was ready almost at once. TTFB, FCP and LCP all wait for the slowest dependency.

**Streaming SSR** keeps one HTTP response open and sends the page in pieces: the **shell** first, then each slow section as soon as its data resolves.

| Question | Streaming SSR |
| --- | --- |
| Where is the HTML generated? | On the server, per request, then hydrated on the client |
| When? | Progressively: the shell immediately, each `<Suspense>` boundary when its data is ready |
| How much JS reaches the client? | The same as SSR, plus a few hundred bytes of inline scripts that place late content |

## Suspense draws the lines

A `<Suspense>` boundary tells React which parts of the page may arrive later. Everything outside every boundary is the **shell**; each boundary's `fallback` is what the shell shows until the content is ready.

```jsx
function ProductPage({ product, reviewsPromise }) {
  return (
    <main>
      <h1>{product.name}</h1>
      <Suspense fallback={<p>Loading reviews…</p>}>
        <Reviews reviewsPromise={reviewsPromise} />
      </Suspense>
    </main>
  );
}

function Reviews({ reviewsPromise }) {
  const reviews = use(reviewsPromise);
  return <ul>{reviews.map((review) => <li key={review.id}>{review.text}</li>)}</ul>;
}
```

`use(promise)` **suspends** while the promise is pending: React stops rendering that subtree, renders the nearest fallback instead, and retries when the promise settles. The server starts the request (`reviewsPromise = loadReviews(id)`) before rendering, so data loading and rendering overlap. Frameworks hide this behind loaders or `async` Server Components.

## The streaming APIs

`renderToString` is synchronous. It cannot wait: a suspended boundary is written as its fallback and **never** completes on the server; the client has to render it after hydration. The streaming renderers wait and stream:

```jsx
const stream = await renderToReadableStream(<ProductPage {...resources} />, {
  bootstrapScripts: ['/assets/client.js'],
  onError(error) {
    logger.error(error);
  },
});
return new Response(stream, { headers: { 'Content-Type': 'text/html' } });
```

- `renderToReadableStream` (Web Streams) runs in edge runtimes, Deno, Bun, Cloudflare Workers and also in browsers. It returns a **promise of the stream** that resolves when the shell is ready and rejects if the shell itself fails.
- `renderToPipeableStream` (Node streams) does the same through callbacks: `onShellReady` (call `pipe(response)`), `onShellError` (send an error page), `onAllReady`, `onError`.
- `stream.allReady` (or `onAllReady`) resolves when **every** boundary has finished. Await it for crawlers or static generation, when complete HTML matters more than early bytes.

## Out-of-order streaming

The response arrives in this order:

1. The shell, with a fallback and a marker comment where the reviews belong.
2. Later, in the same response: the reviews HTML inside a hidden `<div id="S:0">`, followed by a tiny inline `<script>` that moves it into place and removes the fallback.

Boundaries finish in whatever order their data resolves, regardless of their position in the tree. The swap needs no bundle: content appears before React loads.

## Errors stay inside their boundary

If the reviews request rejects, React calls `onError`, keeps the fallback in the HTML and marks the boundary to be **retried on the client**. The shell and every other boundary are unaffected. Only an error in the shell (outside every boundary) rejects `renderToReadableStream` or calls `onShellError`, which is when you answer with a 500 page. Status codes must be decided before the shell is sent, because headers go out with the first byte.

## Selective hydration

`hydrateRoot` on a streamed page does not wait for the whole page either. Each boundary hydrates **independently** once its HTML and code are available, and if the user clicks inside a boundary that has not hydrated yet, React hydrates that one first. A slow, heavy section no longer blocks the interactivity of the header or the buy button.

## The metrics

- **TTFB** drops to the time of the shell, not of the slowest query.
- **FCP** happens with the shell; **LCP** improves when the largest element (usually the hero or the title) is in the shell.
- **CLS** can get worse if fallbacks do not reserve the space of the content that replaces them: size skeletons like the real thing.

## Pitfalls

- A boundary around the whole page: the shell is empty and you gained nothing. A boundary around nothing slow: no difference. Put boundaries around **independent, slow** sections.
- Starting the request inside the component during render (a new promise every render) instead of before rendering or in a cache.
- Buffering proxies, compression settings or serverless platforms that collect the response before sending it undo streaming; check the network waterfall.
- Too many tiny boundaries make content pop in piece by piece; group sections that belong together.

## When to choose it

Use streaming whenever you use SSR and the page has at least one slow or unreliable data dependency that is not needed for the first paint: reviews, recommendations, personalized widgets, comments. Keep critical content (title, price, LCP image) in the shell, and await `allReady` for bots and static generation. If every piece of data is fast or the page is fully static, plain SSR or SSG is simpler; if the slow part is not needed at all for the first view, load it on the client after hydration.
