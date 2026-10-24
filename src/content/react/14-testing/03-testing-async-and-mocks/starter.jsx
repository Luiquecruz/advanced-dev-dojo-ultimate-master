import { useEffect, useState } from 'react';

export async function fetchUsers() {
  const response = await fetch('/api/users');
  // TODO: reject with `Request failed: <status>` when the response is not OK
  return response.json();
}

export function UserDirectory({ onSelect }) {
  const [users, setUsers] = useState(null);

  useEffect(() => {
    // TODO: stop swallowing errors: store them and render an alert with a Retry button
    fetchUsers()
      .then(setUsers)
      .catch(() => {});
  }, []);

  if (!users) {
    return <p>Loading users...</p>;
  }

  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>
          {/* TODO: call onSelect with the user when clicked */}
          <button>{user.name}</button>
        </li>
      ))}
    </ul>
  );
}

export default function App() {
  const [selected, setSelected] = useState(null);
  return (
    <main>
      <UserDirectory onSelect={setSelected} />
      {selected && <p>Selected: {selected.email}</p>}
    </main>
  );
}
