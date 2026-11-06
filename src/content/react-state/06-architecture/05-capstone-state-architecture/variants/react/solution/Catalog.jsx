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
  const q = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? 'all';
  const add = useCartStore((state) => state.add);
  const { data: products, isPending, isError } = useQuery(productsQueryOptions(q));

  function updateParam(name, value, emptyValue) {
    setSearchParams((params) => {
      if (value === emptyValue) {
        params.delete(name);
      } else {
        params.set(name, value);
      }
      return params;
    });
  }

  const visibleProducts = (products ?? []).filter((product) => category === 'all' || product.category === category);

  return (
    <section aria-label="Catalog">
      <SearchForm key={q} initialQuery={q} onSearch={(value) => updateParam('q', value, '')} />
      <div role="group" aria-label="Category">
        {CATEGORIES.map((option) => (
          <button
            key={option.value}
            aria-pressed={category === option.value}
            onClick={() => updateParam('category', option.value, 'all')}
          >
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
