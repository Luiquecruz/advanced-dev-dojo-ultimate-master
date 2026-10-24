const delayPosts = () =>
  mockApi('/posts', async () => {
    await sleep(300);
    return [{ id: 1, userId: 1, title: 'Notes on the Analytical Engine', body: '' }];
  });

const clickLikeABrowser = (name) => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = false;
  screen.getByRole('button', { name }).click();
};

test('renders the About tab first', () => {
  const TabsApp = mod.default;
  render(<TabsApp />);
  expect(screen.getByText('Welcome to the Dojo blog.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'About' })).toHaveAttribute('aria-pressed', 'true');
});

test('switching to Posts keeps the About tab visible instead of the "Loading tab..." fallback', async () => {
  delayPosts();
  const TabsApp = mod.default;
  render(<TabsApp />);
  clickLikeABrowser('Posts');
  await sleep(100);
  expect(screen.queryByText('Loading tab...')).toBeNull();
  expect(screen.getByText('Welcome to the Dojo blog.')).toBeInTheDocument();
});

test('shows "Switching..." in a status element while the Posts tab loads', async () => {
  delayPosts();
  const TabsApp = mod.default;
  render(<TabsApp />);
  clickLikeABrowser('Posts');
  await sleep(100);
  expect(screen.getByRole('status')).toHaveTextContent('Switching...');
});

test('eventually shows the posts and clears the pending status', async () => {
  delayPosts();
  const TabsApp = mod.default;
  render(<TabsApp />);
  clickLikeABrowser('Posts');
  expect(await screen.findByText('Notes on the Analytical Engine', {}, { timeout: 2000 })).toBeInTheDocument();
  expect(screen.queryByRole('status')).toBeNull();
  expect(screen.queryByText('Welcome to the Dojo blog.')).toBeNull();
});

test('uses useTransition', () => {
  expect(source).toMatch(/useTransition\s*\(/);
});
