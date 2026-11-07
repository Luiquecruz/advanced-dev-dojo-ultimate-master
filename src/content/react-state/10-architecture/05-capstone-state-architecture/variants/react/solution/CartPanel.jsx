import { useState } from 'react';
import { selectCount, selectTotal, useCartStore } from './cartStore';

export function CartPanel() {
  const count = useCartStore(selectCount);
  const total = useCartStore(selectTotal);
  const items = useCartStore((state) => state.items);
  const remove = useCartStore((state) => state.remove);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <aside aria-label="Cart">
      <p data-testid="cart-count">Items: {count}</p>
      <p data-testid="cart-total">Total: ${total}</p>
      <button aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)}>
        {isOpen ? 'Hide items' : 'Show items'}
      </button>
      {isOpen && (
        <ul aria-label="Cart items">
          {items.map((item) => (
            <li key={item.id}>
              {item.name} x {item.quantity}
              <button onClick={() => remove(item.id)}>Remove {item.name}</button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
