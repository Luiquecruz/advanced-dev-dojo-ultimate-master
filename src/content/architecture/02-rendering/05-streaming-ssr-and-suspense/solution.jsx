import { Suspense, use } from 'react';
import { renderToReadableStream } from 'react-dom/server';

function Reviews({ reviewsPromise }) {
  const reviews = use(reviewsPromise);

  return (
    <ul aria-label="Reviews">
      {reviews.map((review) => (
        <li key={review.id}>
          {review.author}: {review.text}
        </li>
      ))}
    </ul>
  );
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
        <Suspense fallback={<p>Loading reviews…</p>}>
          <Reviews reviewsPromise={reviewsPromise} />
        </Suspense>
      </section>
    </main>
  );
}

export function renderPage({ product, reviewsPromise }, { onError } = {}) {
  return renderToReadableStream(<ProductPage product={product} reviewsPromise={reviewsPromise} />, { onError });
}
