import { useState } from 'react';
import { renderToString } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import {
  HydrationBoundary,
  QueryClient,
  QueryClientProvider,
  dehydrate,
  queryOptions,
  useQuery,
} from '@tanstack/react-query';

export const productsQueryOptions = queryOptions({
  queryKey: ['products'],
  queryFn: async () => {
    const response = await fetch('/api/products');
    return response.json();
  },
  // TODO: keep hydrated data fresh for a minute so the client does not refetch on mount
});

export function App() {
  const productsQuery = useQuery(productsQueryOptions);
  const [cartCount, setCartCount] = useState(0);

  if (productsQuery.isPending) {
    return <p>Loading products...</p>;
  }

  return (
    <main>
      <h1>Products</h1>
      <p data-testid="cart-count">Cart: {cartCount}</p>
      <ul aria-label="Products">
        {productsQuery.data.map((product) => (
          <li key={product.id}>
            {product.name} (${product.price})
            <button onClick={() => setCartCount((count) => count + 1)}>Add {product.name}</button>
          </li>
        ))}
      </ul>
    </main>
  );
}

const sharedQueryClient = new QueryClient();

export async function renderOnServer() {
  // TODO: create a QueryClient per request, prefetch productsQueryOptions and dehydrate the cache
  // TODO: render App inside QueryClientProvider and HydrationBoundary with the dehydrated state
  const html = renderToString(
    <QueryClientProvider client={sharedQueryClient}>
      <App />
    </QueryClientProvider>,
  );
  return { html, dehydratedState: null };
}

export function hydrateOnClient(container, dehydratedState) {
  // TODO: render the same tree as the server (with HydrationBoundary) and adopt the HTML with hydrateRoot
  const queryClient = new QueryClient();
  const root = createRoot(container);
  root.render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
  return root;
}

export default function Preview() {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}
