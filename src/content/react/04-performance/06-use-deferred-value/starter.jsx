import { Suspense, use, useState } from 'react';

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
  // TODO: create a deferred copy of query with useDeferredValue
  // TODO: compute isStale: true while query and the deferred copy differ

  return (
    <section>
      <label>
        Search users
        <input value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <Suspense fallback={<p>Searching...</p>}>
        {/* TODO: set aria-busy={isStale} and opacity 0.5 while stale */}
        <div>
          {/* TODO: pass the deferred query instead of query */}
          <SearchResults query={query} />
        </div>
      </Suspense>
    </section>
  );
}
