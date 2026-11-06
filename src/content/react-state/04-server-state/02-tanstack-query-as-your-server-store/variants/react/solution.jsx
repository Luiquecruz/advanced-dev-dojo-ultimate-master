import { useState } from 'react';
import { QueryClient, QueryClientProvider, queryOptions, skipToken, useQuery } from '@tanstack/react-query';

async function request(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}

export const userKeys = {
  all: ['users'],
  list: () => [...userKeys.all, 'list'],
  search: (term) => [...userKeys.all, 'search', term],
};

export const postKeys = {
  all: ['posts'],
  byUser: (userId) => [...postKeys.all, { userId }],
};

export const usersListOptions = () =>
  queryOptions({
    queryKey: userKeys.list(),
    queryFn: () => request('/api/users'),
    staleTime: 60_000,
  });

export function AdminList() {
  const { data: admins = [] } = useQuery({
    ...usersListOptions(),
    select: (users) => users.filter((user) => user.role === 'admin'),
  });
  return (
    <ul aria-label="Admins">
      {admins.map((admin) => (
        <li key={admin.id}>{admin.name}</li>
      ))}
    </ul>
  );
}

export function UserCount() {
  const { data: count } = useQuery({
    ...usersListOptions(),
    select: (users) => users.length,
  });
  return <p data-testid="user-count">{count === undefined ? 'Counting...' : `${count} users`}</p>;
}

export function AuthorPosts({ authorName }) {
  const authorQuery = useQuery({
    queryKey: userKeys.search(authorName),
    queryFn: () => request(`/api/search?q=${encodeURIComponent(authorName)}`),
    select: (users) => users[0] ?? null,
  });
  const author = authorQuery.data;

  const postsQuery = useQuery({
    queryKey: postKeys.byUser(author?.id),
    queryFn: author ? () => request(`/api/posts?userId=${author.id}`) : skipToken,
  });

  if (authorQuery.isPending) return <p>Loading author...</p>;
  if (author === null) return <p>No author found</p>;

  return (
    <section>
      <h3>Posts by {author.name}</h3>
      {postsQuery.isPending ? (
        <p>Loading posts...</p>
      ) : (
        <ul aria-label="Posts">
          {postsQuery.data.map((post) => (
            <li key={post.id}>{post.title}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

const queryClient = new QueryClient();

export default function App() {
  const [authorName, setAuthorName] = useState('Ada');
  return (
    <QueryClientProvider client={queryClient}>
      <UserCount />
      <AdminList />
      <label>
        Author
        <input value={authorName} onChange={(event) => setAuthorName(event.target.value)} />
      </label>
      <AuthorPosts authorName={authorName} />
    </QueryClientProvider>
  );
}
