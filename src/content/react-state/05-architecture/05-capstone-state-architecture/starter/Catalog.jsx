import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { productsQueryOptions } from './api';
import { useCartStore } from './cartStore';

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'hardware', label: 'Hardware' },
  { value: 'software', label: 'Software' },
];

function SearchForm({ initialQuery, onSearch }) {
  const [draft, setDraft] = useState(initialQuery);

  function handleSubmit(event) {
    event.preventDefault();
    onSearch(draft.trim());
  }

  return (
    <form role="search" onSubmit={handleSubmit}>
      <label>
        Search products
        <input value={draft} onChange={(event) => setDraft(event.target.value)} />
      </label>
      <button type="submit">Search</button>
    </form>
  );
}

export function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  // TODO: read `q` (default '') and `category` (default 'all') from the URL instead of hard-coded / local state
  const q = '';
  const [category, setCategory] = useState('all');
  const add = useCartStore((state) => state.add);
  const { data: products, isPending, isError } = useQuery(productsQueryOptions(q));

  // TODO: write `q` and `category` to the URL with setSearchParams, deleting the param for '' / 'all' and keeping the other one

  const visibleProducts = (products ?? []).filter((product) => category === 'all' || product.category === category);

  return (
    <section aria-label="Catalog">
      <SearchForm key={q} initialQuery={q} onSearch={() => {}} />
      <div role="group" aria-label="Category">
        {CATEGORIES.map((option) => (
          <button key={option.value} aria-pressed={category === option.value} onClick={() => setCategory(option.value)}>
            {option.label}
          </button>
        ))}
      </div>
      {isPending && <p>Loading products...</p>}
      {isError && <p role="alert">Could not load products</p>}
      <ul aria-label="Products">
        {visibleProducts.map((product) => (
          <li key={product.id}>
            {product.name} (${product.price})
            <button onClick={() => add(product)}>Add {product.name}</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
