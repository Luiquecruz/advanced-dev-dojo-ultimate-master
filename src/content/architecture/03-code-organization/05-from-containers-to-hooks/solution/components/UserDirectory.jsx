export function UserDirectory({ status, users, query, onQueryChange }) {
  return (
    <section aria-label="User directory">
      <h1>Team</h1>
      <label>
        Filter users
        <input value={query} onChange={(event) => onQueryChange(event.target.value)} />
      </label>
      {status === 'loading' && <p>Loading users...</p>}
      {status === 'error' && <p role="alert">Could not load users</p>}
      {status === 'success' && (
        <ul aria-label="Users">
          {users.map((user) => (
            <li key={user.id}>
              {user.name} ({user.role})
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
