const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function countPostRequests() {
  const calls = [];
  mockApi('/api/posts', ({ url }) => {
    const userId = Number(url.searchParams.get('userId'));
    calls.push(userId);
    return [{ id: userId * 10, userId, title: `Post of user ${userId}` }];
  });
  return calls;
}

test('postsQueryOptions(userId) uses the key ["posts", userId] and a queryFn', () => {
  const options = mod.postsQueryOptions(2);
  expect(options.queryKey).toEqual(['posts', 2]);
  expect(typeof options.queryFn).toBe('function');
  expect(options.staleTime).toBe(60000);
});

test('UserPosts shows "Loading posts..." and then the post titles', async () => {
  const UserPosts = mod.UserPosts;
  render(<UserPosts userId={1} />, { wrapper: createWrapper() });
  expect(screen.getByText('Loading posts...')).toBeInTheDocument();
  expect(await screen.findByText('Notes on the Analytical Engine')).toBeInTheDocument();
  expect(screen.getAllByRole('listitem')).toHaveLength(1);
});

test('UserPosts shows an alert when the request fails', async () => {
  mockApi('/api/posts', () => jsonResponse({ error: 'Down' }, 500));
  const UserPosts = mod.UserPosts;
  render(<UserPosts userId={1} />, { wrapper: createWrapper() });
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load posts');
});

test('two components with the same key share one request', async () => {
  const calls = countPostRequests();
  const UserPosts = mod.UserPosts;
  render(
    <>
      <UserPosts userId={1} />
      <UserPosts userId={1} />
    </>,
    { wrapper: createWrapper() },
  );
  expect(await screen.findAllByText('Post of user 1')).toHaveLength(2);
  expect(calls).toEqual([1]);
});

test('revisiting a user shows cached data instantly without refetching (staleTime)', async () => {
  const calls = countPostRequests();
  const UserPosts = mod.UserPosts;
  const { rerender } = render(<UserPosts userId={1} />, { wrapper: createWrapper() });
  await screen.findByText('Post of user 1');
  rerender(<UserPosts userId={2} />);
  await screen.findByText('Post of user 2');
  rerender(<UserPosts userId={1} />);
  expect(screen.getByText('Post of user 1')).toBeInTheDocument();
  await act(() => sleep(50));
  expect(calls).toEqual([1, 2]);
});
