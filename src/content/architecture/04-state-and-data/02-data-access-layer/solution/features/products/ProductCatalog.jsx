import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { productQueries } from './api';

export function ProductCatalog() {
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();
  const productsQuery = useQuery(productQueries.list(searchTerm));

  return (
    <section>
      <h1>Products</h1>
      <label>
        Search products
        <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
      </label>
      <button onClick={() => queryClient.invalidateQueries({ queryKey: productQueries.all().queryKey })}>Refresh</button>
      {productsQuery.isPending && <p>Loading products...</p>}
      {productsQuery.isError && <p role="alert">Could not load products (status {productsQuery.error.status})</p>}
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
