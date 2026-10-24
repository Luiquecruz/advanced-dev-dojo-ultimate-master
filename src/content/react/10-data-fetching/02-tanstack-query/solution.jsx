import { useState } from 'react';
import { QueryClient, QueryClientProvider, queryOptions, useQuery } from '@tanstack/react-query';

export async function fetchPosts(userId) {
  const response = await fetch(`/api/posts?userId=${userId}`);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}

export function postsQueryOptions(userId) {
  return queryOptions({
    queryKey: ['posts', userId],
    queryFn: () => fetchPosts(userId),
    staleTime: 60_000,
  });
}

export function UserPosts({ userId }) {
  const { data, isPending, isError } = useQuery(postsQueryOptions(userId));

  if (isPending) return <p>Loading posts...</p>;
  if (isError) return <p role="alert">Could not load posts</p>;

  return (
    <ul>
      {data.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}

const queryClient = new QueryClient();

export default function App() {
  const [userId, setUserId] = useState(1);

  return (
    <QueryClientProvider client={queryClient}>
      <nav>
        {[1, 2, 3].map((id) => (
          <button key={id} onClick={() => setUserId(id)}>
            User {id}
          </button>
        ))}
      </nav>
      <UserPosts userId={userId} />
    </QueryClientProvider>
  );
}
