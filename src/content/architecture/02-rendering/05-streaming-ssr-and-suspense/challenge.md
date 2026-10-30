A product page has a fast part (name and price) and a slow part (reviews from another service). The starter renders it with `renderToString`, so the page either waits for nothing or breaks. Turn it into **streaming SSR**: the shell is sent at once and the reviews stream into the same response when their promise resolves. `App.jsx` plays the server; the tests read the stream chunk by chunk.

**`Reviews({ reviewsPromise })`** (internal component)

- Read the reviews with `use(reviewsPromise)`.
- Render `<ul aria-label="Reviews">` with one `<li>` per review whose text reads `Ada: Great feel` (`author`, a colon and a space, `text`).

**`ProductPage({ product, reviewsPromise })`** (named export)

- The header (`<h1>` with the product name and the price) is already written and must stay outside any boundary: it is the shell.
- Wrap `<Reviews>` in a `<Suspense>` boundary whose fallback is exactly `<p>Loading reviews…</p>` (with the `…` character).

**`renderPage({ product, reviewsPromise }, { onError })`** (named export)

- Return the result of `renderToReadableStream(<ProductPage … />, { onError })`: a promise that resolves to a `ReadableStream` as soon as the shell is ready, without waiting for the reviews.
- The stream must carry `allReady`, which resolves only after the reviews have rendered (`renderToReadableStream` adds it).
- Pass `onError` through, so a rejected reviews promise is reported while the shell and the fallback are still sent.
- Do not use `renderToString`.

The tests create `reviewsPromise` themselves and resolve or reject it while reading the stream:

- the first chunks contain `<h1>Mechanical Keyboard</h1>` and `Loading reviews…` but no review,
- after the promise resolves, the rest of the response contains `Ada: Great feel`, `Alan: A bit loud` and the inline `<script>` that swaps them in,
- `allReady` is still pending while the reviews are,
- a rejection with `Reviews service is down` keeps the shell and the fallback and calls `onError` with that error.
