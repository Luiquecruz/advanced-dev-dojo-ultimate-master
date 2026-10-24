import { Suspense, useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useSuspenseQuery } from '@tanstack/react-query';

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}

export const userQuery = (userId) => ({
  queryKey: ['user', userId],
  queryFn: () => getJson(`/api/users/${userId}`),
});

export const postsQuery = (userId) => ({
  queryKey: ['posts', userId],
  queryFn: () => getJson(`/api/posts?userId=${userId}`),
});

export function UserProfile({ userId }) {
  // TODO: replace useQuery with useSuspenseQuery and remove the pending check
  const { data: user, isPending } = useQuery(userQuery(userId));
  if (isPending) return <p>Loading...</p>;
  return (
    <header>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </header>
  );
}

export function UserPosts({ userId }) {
  // TODO: read postsQuery(userId) with useSuspenseQuery and render a <ul> of post titles
  return <ul />;
}

export function ProfilePage({ userId }) {
  // TODO: wrap UserProfile in <Suspense fallback={<p>Loading profile...</p>}>
  // TODO: wrap UserPosts in a nested <Suspense fallback={<p>Loading posts...</p>}>
  return (
    <>
      <UserProfile userId={userId} />
      <UserPosts userId={userId} />
    </>
  );
}

const queryClient = new QueryClient();

export default function App() {
  const [userId, setUserId] = useState(1);
  return (
    <QueryClientProvider client={queryClient}>
      <button onClick={() => setUserId((id) => (id % 3) + 1)}>Next user</button>
      <ProfilePage userId={userId} />
    </QueryClientProvider>
  );
}
