import { Link, MemoryRouter, Outlet, Route, Routes, useParams } from 'react-router';

export const users = [
  { id: 1, name: 'Ada Lovelace', role: 'admin' },
  { id: 2, name: 'Alan Turing', role: 'editor' },
  { id: 3, name: 'Grace Hopper', role: 'viewer' },
];

function UsersLayout() {
  return (
    <section>
      <h1>Users</h1>
      <ul>
        {users.map((user) => (
          <li key={user.id}>
            <Link to={`/users/${user.id}`}>{user.name}</Link>
          </li>
        ))}
      </ul>
      <Outlet />
    </section>
  );
}

function UserDetail() {
  const { userId } = useParams();
  const user = users.find((entry) => entry.id === Number(userId));
  if (!user) {
    return <p>User not found</p>;
  }
  return (
    <article>
      <h2>{user.name}</h2>
      <p>Role: {user.role}</p>
    </article>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<h1>Welcome</h1>} />
      <Route path="users" element={<UsersLayout />}>
        <Route index element={<p>Select a user</p>} />
        <Route path=":userId" element={<UserDetail />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <MemoryRouter initialEntries={['/users']}>
      <AppRoutes />
    </MemoryRouter>
  );
}
