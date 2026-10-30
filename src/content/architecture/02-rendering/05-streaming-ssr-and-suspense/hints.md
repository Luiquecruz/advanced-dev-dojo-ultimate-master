Three things are missing: the component never suspends, there is no boundary to suspend into, and the renderer cannot wait. Fix them in that order: `use`, `<Suspense>`, `renderToReadableStream`.
---
`const reviews = use(reviewsPromise);` suspends `Reviews` until the promise settles. Render the items as `{review.author}: {review.text}`. Then put `<Suspense fallback={<p>Loading reviews…</p>}>` around `<Reviews reviewsPromise={reviewsPromise} />`, leaving the `<header>` outside it.
---
`renderPage` becomes one line: `return renderToReadableStream(<ProductPage product={product} reviewsPromise={reviewsPromise} />, { onError });`. Do not `await stream.allReady` inside it: that would hold the shell until the reviews arrive, which is exactly what streaming avoids.
