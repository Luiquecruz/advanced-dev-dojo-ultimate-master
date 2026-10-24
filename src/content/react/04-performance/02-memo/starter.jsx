import { memo, useState } from 'react';

const DEFAULT_USERS = [
  { id: 1, name: 'Ada Lovelace', email: 'ada@example.com' },
  { id: 2, name: 'Alan Turing', email: 'alan@example.com' },
];

// TODO: wrap UserList with memo() and keep the `export`
export function UserList({ users, options, onRender }) {
  onRender?.();
  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>
          {user.name}
          {options.showEmail && <small> ({user.email})</small>}
        </li>
      ))}
    </ul>
  );
}

export default function Dashboard({ users = DEFAULT_USERS, onListRender }) {
  const [clicks, setClicks] = useState(0);

  return (
    <section>
      <button onClick={() => setClicks((count) => count + 1)}>Clicks: {clicks}</button>
      {/* TODO: this inline object is a new reference on every render. Hoist it to a module constant. */}
      <UserList users={users} options={{ showEmail: true }} onRender={onListRender} />
    </section>
  );
}
