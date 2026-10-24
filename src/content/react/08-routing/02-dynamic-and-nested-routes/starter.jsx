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
            {/* TODO: link to /users/{id} */}
            {user.name}
          </li>
        ))}
      </ul>
      {/* TODO: render the matched child route here */}
    </section>
  );
}

function UserDetail() {
  // TODO: read userId with useParams() and find the user (params are strings!)
  return <p>User not found</p>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<h1>Welcome</h1>} />
      {/* TODO: /users with UsersLayout, an index route and a :userId route */}
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
