import { memo, useState } from 'react';

const DEFAULT_USERS = [
  { id: 1, name: 'Ada Lovelace', email: 'ada@example.com' },
  { id: 2, name: 'Alan Turing', email: 'alan@example.com' },
];

const LIST_OPTIONS = { showEmail: true };

export const UserList = memo(function UserList({ users, options, onRender }) {
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
});

export default function Dashboard({ users = DEFAULT_USERS, onListRender }) {
  const [clicks, setClicks] = useState(0);

  return (
    <section>
      <button onClick={() => setClicks((count) => count + 1)}>Clicks: {clicks}</button>
      <UserList users={users} options={LIST_OPTIONS} onRender={onListRender} />
    </section>
  );
}
