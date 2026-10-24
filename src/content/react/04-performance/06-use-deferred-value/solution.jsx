import { Suspense, use, useDeferredValue, useState } from 'react';

const cache = new Map();

function searchUsers(query) {
  if (!cache.has(query)) {
    cache.set(query, fetch(`/api/search?q=${encodeURIComponent(query)}`).then((response) => response.json()));
  }
  return cache.get(query);
}

function SearchResults({ query }) {
  const users = use(searchUsers(query));
  if (users.length === 0) {
    return <p>No users match "{query}".</p>;
  }
  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}

export default function UserSearch() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const isStale = query !== deferredQuery;

  return (
    <section>
      <label>
        Search users
        <input value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <Suspense fallback={<p>Searching...</p>}>
        <div aria-busy={isStale} style={{ opacity: isStale ? 0.5 : 1 }}>
          <SearchResults query={deferredQuery} />
        </div>
      </Suspense>
    </section>
  );
}
