import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProductCatalog } from './features/products';

export default function App() {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <main>
        <ProductCatalog />
      </main>
    </QueryClientProvider>
  );
}
