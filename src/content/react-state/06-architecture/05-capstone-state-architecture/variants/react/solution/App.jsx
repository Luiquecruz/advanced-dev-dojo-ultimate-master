import { useState } from 'react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Catalog } from './Catalog';
import { CartPanel } from './CartPanel';

export function Shop() {
  return (
    <main>
      <Catalog />
      <CartPanel />
    </main>
  );
}

export default function App() {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Shop />
      </MemoryRouter>
    </QueryClientProvider>
  );
}
