import { useState } from 'react';

export default function ProductSearch({ products, onSearch }) {
  const [query, setQuery] = useState('');
  const visible = products.filter((product) => product.name.toLowerCase().includes(query.toLowerCase()));

  function handleChange(event) {
    setQuery(event.target.value);
    onSearch(event.target.value);
  }

  return (
    <section>
      <label>
        Search
        <input value={query} onChange={handleChange} />
      </label>
      <p>{visible.length} results</p>
      <ul>
        {visible.map((product) => (
          <li key={product.id}>{product.name}</li>
        ))}
      </ul>
    </section>
  );
}
