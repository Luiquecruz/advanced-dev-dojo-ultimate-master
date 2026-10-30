import { useState } from 'react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';

export default function App({ products }) {
  const [sortedByPrice, setSortedByPrice] = useState(false);
  const visibleProducts = sortedByPrice ? [...products].sort((first, second) => first.price - second.price) : products;

  return (
    <main>
      <h1>Products</h1>
      <button type="button" aria-pressed={sortedByPrice} onClick={() => setSortedByPrice(!sortedByPrice)}>
        Sort by price
      </button>
      <ul aria-label="Products">
        {visibleProducts.map((product) => (
          <li key={product.id}>
            {product.name} ${product.price}
          </li>
        ))}
      </ul>
    </main>
  );
}

export function serializeData(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export async function handleRequest(url) {
  const response = await fetch('/api/products');
  const products = await response.json();
  const appHtml = renderToString(<App products={products} />);

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Products</title>
  </head>
  <body>
    <div id="root">${appHtml}</div>
    <script id="__DATA__" type="application/json">${serializeData(products)}</script>
    <script type="module" src="/assets/client.js"></script>
  </body>
</html>`;

  return { status: 200, html };
}

export function hydrate(container) {
  const products = JSON.parse(document.getElementById('__DATA__').textContent);
  return hydrateRoot(container, <App products={products} />);
}
