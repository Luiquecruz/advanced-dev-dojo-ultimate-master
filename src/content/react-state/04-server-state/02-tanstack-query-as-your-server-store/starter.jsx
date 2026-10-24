import { useState } from 'react';
import { QueryClient, QueryClientProvider, queryOptions, skipToken, useQuery } from '@tanstack/react-query';

async function request(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}

// TODO: build every key from `all`: list() -> ['users', 'list'], search(term) -> ['users', 'search', term]
export const userKeys = {
  all: ['users'],
  list: () => ['users'],
  search: (term) => ['search', term],
};

// TODO: byUser(userId) -> ['posts', { userId }]
export const postKeys = {
  all: ['posts'],
  byUser: (userId) => ['posts', userId],
};

// TODO: add staleTime: 60_000
export const usersListOptions = () =>
  queryOptions({
    queryKey: userKeys.list(),
    queryFn: () => request('/api/users'),
  });

export function AdminList() {
  // TODO: reuse usersListOptions() and derive the admins with `select` instead of a separate key
  const { data: users = [] } = useQuery({ queryKey: ['admins'], queryFn: () => request('/api/users') });
  const admins = users.filter((user) => user.role === 'admin');
  return (
    <ul aria-label="Admins">
      {admins.map((admin) => (
        <li key={admin.id}>{admin.name}</li>
      ))}
    </ul>
  );
}

export function UserCount() {
  // TODO: reuse usersListOptions() and derive the count with `select`
  const { data: users } = useQuery({ queryKey: ['user-count'], queryFn: () => request('/api/users') });
  const count = users?.length;
  return <p data-testid="user-count">{count === undefined ? 'Counting...' : `${count} users`}</p>;
}

export function AuthorPosts({ authorName }) {
  // TODO: use userKeys.search(authorName) and `select` the first match (or null)
  const authorQuery = useQuery({
    queryKey: ['author', authorName],
    queryFn: () => request(`/api/search?q=${encodeURIComponent(authorName)}`),
  });
  const author = authorQuery.data ? authorQuery.data[0] ?? null : undefined;

  // TODO: use postKeys.byUser(author?.id) and skip the request (skipToken) until the author is known
  const postsQuery = useQuery({
    queryKey: ['posts', author?.id],
    queryFn: () => request(`/api/posts?userId=${author?.id}`),
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
