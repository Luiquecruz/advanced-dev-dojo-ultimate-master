import { useEffect, useState } from 'react';

export default function ProductSearch({ products, onSearch }) {
  const [query, setQuery] = useState('');
  // TODO: remove this state and compute the filtered list during render
  const [visible, setVisible] = useState([]);

  // TODO: delete this Effect: derived data does not need one
  useEffect(() => {
    setVisible(products.filter((product) => product.name.toLowerCase().includes(query.toLowerCase())));
  }, [products, query]);

  // TODO: delete this Effect and notify onSearch from the change handler instead
  useEffect(() => {
    onSearch(query);
  }, [query]);

  return (
    <section>
      <label>
        Search
        <input value={query} onChange={(event) => setQuery(event.target.value)} />
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
