import { useEffect, useState } from 'react';
import { renderToString } from 'react-dom/server';
import { createRoot, hydrateRoot } from 'react-dom/client';

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
  // TODO: escape "<" as \u003c so the JSON can never close the <script> tag
  return JSON.stringify(data);
}

export async function handleRequest(url) {
  // TODO: fetch /api/products here, render <App products={products} /> with renderToString inside #root
  // and embed the data in <script id="__DATA__" type="application/json">
  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Products</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/client.js"></script>
  </body>
</html>`;

  return { status: 200, html };
}

function ClientApp() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch('/api/products')
      .then((response) => response.json())
      .then(setProducts);
  }, []);

  return <App products={products} />;
}

export function hydrate(container) {
  // TODO: read the products from #__DATA__ and hydrateRoot instead of rendering from scratch and refetching
  const root = createRoot(container);
  root.render(<ClientApp />);
  return root;
}
