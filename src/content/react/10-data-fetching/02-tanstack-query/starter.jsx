import { useState } from 'react';
import { QueryClient, QueryClientProvider, queryOptions, useQuery } from '@tanstack/react-query';

export async function fetchPosts(userId) {
  const response = await fetch(`/api/posts?userId=${userId}`);
  // TODO: throw new Error(`Request failed with status ${response.status}`) when the response is not ok
  return response.json();
}

export function postsQueryOptions(userId) {
  // TODO: return queryOptions({ queryKey: ['posts', userId], queryFn, staleTime: 60_000 })
  return {};
}

export function UserPosts({ userId }) {
  // TODO: call useQuery(postsQueryOptions(userId))
  // TODO: render "Loading posts..." while pending and <p role="alert">Could not load posts</p> on error
  // TODO: render a <ul> with one <li> per post title
  return null;
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
