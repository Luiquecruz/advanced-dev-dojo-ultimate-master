import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CheckoutView } from './checkout/CheckoutView';
import { useCheckout as useLocalCheckout } from './local/useCheckout';
import { CheckoutProvider as QueryCheckoutProvider, useCheckout as useQueryCheckout } from './query/useCheckout';
import { useCheckout as useMachineCheckout } from './machine/useCheckout';

export const CART_ITEMS = [
  { id: 1, name: 'Keyboard', price: 120, quantity: 1 },
  { id: 2, name: 'Mouse', price: 45, quantity: 2 },
];

function LocalCheckout() {
  return <CheckoutView checkout={useLocalCheckout()} cartItems={CART_ITEMS} />;
}

function QueryCheckout() {
  return <CheckoutView checkout={useQueryCheckout()} cartItems={CART_ITEMS} />;
}

function MachineCheckout() {
  return <CheckoutView checkout={useMachineCheckout()} cartItems={CART_ITEMS} />;
}

const IMPLEMENTATIONS = {
  local: () => <LocalCheckout />,
  query: () => (
    <QueryCheckoutProvider>
      <QueryCheckout />
    </QueryCheckoutProvider>
  ),
  machine: () => <MachineCheckout />,
};

export default function App() {
  const [queryClient] = useState(() => new QueryClient());
  const [implementation, setImplementation] = useState('local');
  const renderCheckout = IMPLEMENTATIONS[implementation];

  return (
    <QueryClientProvider client={queryClient}>
      <main>
        <label>
          Implementation
          <select value={implementation} onChange={(event) => setImplementation(event.target.value)}>
            <option value="local">useReducer</option>
            <option value="query">TanStack Query + Context</option>
            <option value="machine">XState</option>
          </select>
        </label>
        <div key={implementation}>{renderCheckout()}</div>
      </main>
    </QueryClientProvider>
  );
}
