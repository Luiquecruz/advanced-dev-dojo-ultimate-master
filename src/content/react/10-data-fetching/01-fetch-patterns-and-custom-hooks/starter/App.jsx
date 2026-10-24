import { useFetch } from './useFetch';

export function UserList() {
  const { data, error, isLoading } = useFetch('/api/users');

  // TODO: render "Loading users..." while loading
  // TODO: render <p role="alert">{error.message}</p> on error
  // TODO: render a <ul> with one <li> per user name

  return null;
}

export default function App() {
  return <UserList />;
}
