import { useState } from 'react';
import type { ReactNode } from 'react';

// TODO: declare ListProps<T> with items, renderItem, getKey and emptyText?

// TODO: make List generic and type its props with ListProps<T>
export function List({ items, renderItem, getKey, emptyText = 'No items' }: any) {
  // TODO: render <p>{emptyText}</p> when there are no items
  return (
    <ul>
      {items.map((item: any) => (
        <li key={getKey(item)}>{renderItem(item)}</li>
      ))}
    </ul>
  );
}

// TODO: declare SelectProps<T> with label, options, value, getLabel, getValue and onChange

// TODO: make Select generic and call onChange with the original option object
export function Select({ label, options, value, getLabel, getValue, onChange }: any) {
  return (
    <label>
      {label} <select />
    </label>
  );
}

type Product = { id: number; name: string; price: number };

const products: Product[] = [
  { id: 1, name: 'Keyboard', price: 120 },
  { id: 2, name: 'Mouse', price: 45 },
  { id: 3, name: 'Monitor', price: 340 },
];

export default function App() {
  const [product, setProduct] = useState(products[0]);
  return (
    <section>
      <Select
        label="Product"
        options={products}
        value={product}
        getLabel={(option) => option.name}
        getValue={(option) => String(option.id)}
        onChange={setProduct}
      />
      <List items={products} getKey={(item) => item.id} renderItem={(item) => `${item.name}: $${item.price}`} />
      <p>Selected: {product.name}</p>
    </section>
  );
}
