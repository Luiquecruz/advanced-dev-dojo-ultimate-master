import { useState } from 'react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
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
  staleTime: 60_000,
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

function AppTree({ queryClient, dehydratedState }) {
  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>
        <App />
      </HydrationBoundary>
    </QueryClientProvider>
  );
}

export async function renderOnServer() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery(productsQueryOptions);
  const dehydratedState = dehydrate(queryClient);
  const html = renderToString(<AppTree queryClient={queryClient} dehydratedState={dehydratedState} />);
  return { html, dehydratedState };
}

export function hydrateOnClient(container, dehydratedState) {
  const queryClient = new QueryClient();
  return hydrateRoot(container, <AppTree queryClient={queryClient} dehydratedState={dehydratedState} />);
}

export default function Preview() {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}
