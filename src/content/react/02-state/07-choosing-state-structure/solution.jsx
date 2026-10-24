import { useState } from 'react';

const initialItems = [
  { id: 1, name: 'Keyboard', price: 120, quantity: 1 },
  { id: 2, name: 'Mouse', price: 45, quantity: 2 },
  { id: 4, name: 'Monitor', price: 340, quantity: 1 },
];

export default function Cart() {
  const [items, setItems] = useState(initialItems);
  const [selectedId, setSelectedId] = useState(null);

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const selectedItem = items.find((item) => item.id === selectedId);

  function changeQuantity(id, delta) {
    setItems(
      items
        .map((entry) => (entry.id === id ? { ...entry, quantity: entry.quantity + delta } : entry))
        .filter((entry) => entry.quantity > 0)
    );
  }

  return (
    <section>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <button type="button" onClick={() => setSelectedId(item.id)}>
              {item.name}
            </button>
            <span> × {item.quantity} </span>
            <button type="button" aria-label={`Decrease ${item.name}`} onClick={() => changeQuantity(item.id, -1)}>
              −
            </button>
            <button type="button" aria-label={`Increase ${item.name}`} onClick={() => changeQuantity(item.id, 1)}>
              +
            </button>
          </li>
        ))}
      </ul>
      <p className="selected">
        {selectedItem ? `Selected: ${selectedItem.name} × ${selectedItem.quantity}` : 'Nothing selected'}
      </p>
      <p className="total">Total: ${total}</p>
    </section>
  );
}
