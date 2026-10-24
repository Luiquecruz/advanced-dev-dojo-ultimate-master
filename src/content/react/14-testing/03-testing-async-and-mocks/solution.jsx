import { useEffect, useState } from 'react';

export async function fetchUsers() {
  const response = await fetch('/api/users');
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

export function UserDirectory({ onSelect }) {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;
    setUsers(null);
    setError(null);
    fetchUsers().then(
      (data) => {
        if (!ignore) setUsers(data);
      },
      (reason) => {
        if (!ignore) setError(reason);
      },
    );
    return () => {
      ignore = true;
    };
  }, [attempt]);

  if (error) {
    return (
      <div>
        <p role="alert">Could not load users.</p>
        <button onClick={() => setAttempt((count) => count + 1)}>Retry</button>
      </div>
    );
  }

  if (!users) {
    return <p>Loading users...</p>;
  }

  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>
          <button onClick={() => onSelect(user)}>{user.name}</button>
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
