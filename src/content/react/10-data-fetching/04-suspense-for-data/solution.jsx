import { Suspense, useState } from 'react';
import { QueryClient, QueryClientProvider, useSuspenseQuery } from '@tanstack/react-query';

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
  const { data: user } = useSuspenseQuery(userQuery(userId));
  return (
    <header>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </header>
  );
}

export function UserPosts({ userId }) {
  const { data: posts } = useSuspenseQuery(postsQuery(userId));
  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}

export function ProfilePage({ userId }) {
  return (
    <Suspense fallback={<p>Loading profile...</p>}>
      <UserProfile userId={userId} />
      <Suspense fallback={<p>Loading posts...</p>}>
        <UserPosts userId={userId} />
      </Suspense>
    </Suspense>
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
