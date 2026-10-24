import { useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';

export interface ListProps<T> {
  items: readonly T[];
  renderItem: (item: T) => ReactNode;
  getKey: (item: T) => string | number;
  emptyText?: string;
}

export function List<T>({ items, renderItem, getKey, emptyText = 'No items' }: ListProps<T>) {
  if (items.length === 0) {
    return <p>{emptyText}</p>;
  }
  return (
    <ul>
      {items.map((item) => (
        <li key={getKey(item)}>{renderItem(item)}</li>
      ))}
    </ul>
  );
}

export interface SelectProps<T> {
  label: string;
  options: readonly T[];
  value: T;
  getLabel: (option: T) => string;
  getValue: (option: T) => string;
  onChange: (option: T) => void;
}

export function Select<T>({ label, options, value, getLabel, getValue, onChange }: SelectProps<T>) {
  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const selected = options.find((option) => getValue(option) === event.target.value);
    if (selected !== undefined) {
      onChange(selected);
    }
  }

  return (
    <label>
      {label}{' '}
      <select value={getValue(value)} onChange={handleChange}>
        {options.map((option) => (
          <option key={getValue(option)} value={getValue(option)}>
            {getLabel(option)}
          </option>
        ))}
      </select>
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
