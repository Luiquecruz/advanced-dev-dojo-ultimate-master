import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

export function ProductCatalog() {
  const [searchTerm, setSearchTerm] = useState('');
  // TODO: replace this ad-hoc key and inline fetch with useQuery(productQueries.list(searchTerm))
  const productsQuery = useQuery({
    queryKey: ['product-search', searchTerm],
    queryFn: () => fetch(`/api/products?q=${searchTerm}`).then((response) => response.json()),
  });

  return (
    <section>
      <h1>Products</h1>
      <label>
        Search products
        <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
      </label>
      {/* TODO: add a Refresh button that invalidates every product query */}
      {productsQuery.isPending && <p>Loading products...</p>}
      {/* TODO: when the query fails, render <p role="alert">Could not load products (status {status})</p> */}
      {productsQuery.isSuccess && (
        <ul aria-label="Products">
          {productsQuery.data.map((product) => (
            <li key={product.id}>
              {product.name} (${product.price})
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
