import { useSyncExternalStore } from 'react';

export function CartPage({ store }) {
  const lines = useSyncExternalStore(store.subscribe, store.getLines);
  const count = lines.reduce((total, line) => total + line.quantity, 0);

  return (
    <section>
      <h2>Cart</h2>
      <p data-testid="cart-count">Items: {count}</p>
      <ul aria-label="Cart lines">
        {lines.map((line) => (
          <li key={line.id}>
            {line.name} × {line.quantity}
          </li>
        ))}
      </ul>
    </section>
  );
}
