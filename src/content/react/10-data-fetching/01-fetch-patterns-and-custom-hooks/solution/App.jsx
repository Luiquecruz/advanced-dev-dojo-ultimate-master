import { useFetch } from './useFetch';

export function UserList() {
  const { data, error, isLoading } = useFetch('/api/users');

  if (isLoading) return <p>Loading users...</p>;
  if (error) return <p role="alert">{error.message}</p>;

  return (
    <ul>
      {data.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}

export default function App() {
  return <UserList />;
}
