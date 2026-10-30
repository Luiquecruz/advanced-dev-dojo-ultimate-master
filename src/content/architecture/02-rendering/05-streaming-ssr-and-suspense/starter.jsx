import { Suspense, use } from 'react';
import { renderToString, renderToReadableStream } from 'react-dom/server';

function Reviews({ reviewsPromise }) {
  // TODO: read the reviews with use(reviewsPromise) and render one <li> per review ("Ada: Great feel")
  return <ul aria-label="Reviews"></ul>;
}

export function ProductPage({ product, reviewsPromise }) {
  return (
    <main>
      <header>
        <h1>{product.name}</h1>
        <p>${product.price}</p>
      </header>
      <section>
        <h2>Reviews</h2>
        {/* TODO: wrap the reviews in a Suspense boundary whose fallback is <p>Loading reviews…</p> */}
        <Reviews reviewsPromise={reviewsPromise} />
      </section>
    </main>
  );
}

export async function renderPage({ product, reviewsPromise }, { onError } = {}) {
  // TODO: stream the page with renderToReadableStream and pass onError, instead of buffering one string
  const html = renderToString(<ProductPage product={product} reviewsPromise={reviewsPromise} />);
  return new Response(html).body;
}
