const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');

function renderProfile(userId) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const ProfilePage = mod.ProfilePage;
  render(
    <QueryClientProvider client={client}>
      <ProfilePage userId={userId} />
    </QueryClientProvider>,
  );
}

test('shows the "Loading profile..." fallback while the user is loading', () => {
  renderProfile(1);
  expect(screen.getByText('Loading profile...')).toBeInTheDocument();
});

test('renders the user name in an <h2> and the user posts after loading', async () => {
  renderProfile(1);
  expect(await screen.findByRole('heading', { level: 2, name: 'Ada Lovelace' })).toBeInTheDocument();
  expect(await screen.findByText('Notes on the Analytical Engine')).toBeInTheDocument();
  expect(screen.queryByText('Loading profile...')).toBeNull();
});

test('a nested boundary reveals the profile while posts are still loading', async () => {
  mockApi('/api/posts', async () => {
    await sleep(600);
    return [{ id: 99, userId: 3, title: 'Slow post' }];
  });
  renderProfile(3);
  expect(await screen.findByRole('heading', { level: 2, name: 'Grace Hopper' })).toBeInTheDocument();
  expect(screen.getByText('Loading posts...')).toBeInTheDocument();
  expect(await screen.findByText('Slow post', {}, { timeout: 2000 })).toBeInTheDocument();
});

test('components read data with useSuspenseQuery instead of pending checks', () => {
  expect(source.match(/useSuspenseQuery\(/g) ?? []).toHaveLength(2);
  expect(source).not.toMatch(/\buseQuery\(/);
  expect(source).not.toMatch(/isPending|isLoading/);
});
