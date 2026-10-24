import { useState } from 'react';

const initialItems = [
  { id: 1, name: 'Keyboard', price: 120, quantity: 1 },
  { id: 2, name: 'Mouse', price: 45, quantity: 2 },
  { id: 4, name: 'Monitor', price: 340, quantity: 1 },
];

export default function Cart() {
  const [items, setItems] = useState(initialItems);
  // TODO: store the selected id instead of a copy of the selected object
  const [selectedItem, setSelectedItem] = useState(null);
  // TODO: total can be computed from items; remove this state
  const [total, setTotal] = useState(550);

  function increase(id) {
    const item = items.find((entry) => entry.id === id);
    setItems(items.map((entry) => (entry.id === id ? { ...entry, quantity: entry.quantity + 1 } : entry)));
    setTotal(total + item.price);
  }

  function decrease(id) {
    setItems(
      items
        .map((entry) => (entry.id === id ? { ...entry, quantity: entry.quantity - 1 } : entry))
        .filter((entry) => entry.quantity > 0)
    );
  }

  return (
    <section>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <button type="button" onClick={() => setSelectedItem(item)}>
              {item.name}
            </button>
            <span> × {item.quantity} </span>
            <button type="button" aria-label={`Decrease ${item.name}`} onClick={() => decrease(item.id)}>
              −
            </button>
            <button type="button" aria-label={`Increase ${item.name}`} onClick={() => increase(item.id)}>
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
