import { UserDirectory } from './components/UserDirectory';
import { useUserDirectory } from './hooks/useUserDirectory';

export default function App() {
  const { status, users, query, setQuery } = useUserDirectory();
  return <UserDirectory status={status} users={users} query={query} onQueryChange={setQuery} />;
}
