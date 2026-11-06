const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');

function renderWithClient(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  return client;
}

function trackPostRequests() {
  const calls = [];
  mockApi('/api/posts', ({ url }) => {
    const userId = Number(url.searchParams.get('userId'));
    calls.push(userId);
    return [{ id: userId * 10, userId, title: `Post of user ${userId}` }];
  });
  return calls;
}

test('key factories build hierarchical keys and usersListOptions is fresh for one minute', () => {
  expect(mod.userKeys.list()).toEqual(['users', 'list']);
  expect(mod.userKeys.search('ada')).toEqual(['users', 'search', 'ada']);
  expect(mod.postKeys.byUser(2)).toEqual(['posts', { userId: 2 }]);
  const options = mod.usersListOptions();
  expect(options.queryKey).toEqual(['users', 'list']);
  expect(options.staleTime).toBe(60000);
});

test('AdminList and UserCount share one /api/users request and derive different data with select', async () => {
  const calls = [];
  mockApi('/api/users', () => {
    calls.push('users');
    return [
      { id: 1, name: 'Ada Lovelace', role: 'admin' },
      { id: 2, name: 'Alan Turing', role: 'editor' },
      { id: 5, name: 'Margaret Hamilton', role: 'admin' },
    ];
  });
  const { AdminList, UserCount } = mod;
  const client = renderWithClient(
    <>
      <UserCount />
      <AdminList />
    </>,
  );
  expect(await screen.findByText('3 users')).toBeInTheDocument();
  const admins = await screen.findByRole('list', { name: 'Admins' });
  await waitFor(() => expect(within(admins).getAllByRole('listitem')).toHaveLength(2));
  expect(within(admins).getByText('Margaret Hamilton')).toBeInTheDocument();
  expect(calls).toHaveLength(1);
  expect(client.getQueryData(['users', 'list'])).toHaveLength(3);
});

test('AuthorPosts resolves the author, then loads their posts into ["posts", { userId }]', async () => {
  const AuthorPosts = mod.AuthorPosts;
  const client = renderWithClient(<AuthorPosts authorName="Grace" />);
  expect(await screen.findByRole('heading', { name: 'Posts by Grace Hopper' })).toBeInTheDocument();
  expect(await screen.findByText('The first bug')).toBeInTheDocument();
  expect(client.getQueryData(['posts', { userId: 3 }])).toHaveLength(1);
});

test('the posts request waits for the author query (dependent query)', async () => {
  mockApi('/api/search', async () => {
    await sleep(150);
    return [{ id: 1, name: 'Ada Lovelace', email: 'ada@example.com', role: 'admin' }];
  });
  const calls = trackPostRequests();
  const AuthorPosts = mod.AuthorPosts;
  renderWithClient(<AuthorPosts authorName="Ada" />);
  await act(() => sleep(60));
  expect(screen.getByText('Loading author...')).toBeInTheDocument();
  expect(calls).toEqual([]);
  expect(await screen.findByText('Post of user 1')).toBeInTheDocument();
  expect(calls).toEqual([1]);
});

test('when no author matches it shows "No author found" and never requests posts', async () => {
  const calls = trackPostRequests();
  const AuthorPosts = mod.AuthorPosts;
  renderWithClient(<AuthorPosts authorName="Nobody" />);
  expect(await screen.findByText('No author found')).toBeInTheDocument();
  await act(() => sleep(50));
  expect(calls).toEqual([]);
});
