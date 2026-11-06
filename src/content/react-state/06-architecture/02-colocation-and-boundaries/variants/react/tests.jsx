function renderApp() {
  const App = mod.default;
  render(<App />);
}

test('the global store only keeps shared state: theme and toggleTheme', () => {
  const state = modules['store.js'].useAppStore.getState();
  expect(Object.keys(state).sort()).toEqual(['theme', 'toggleTheme']);
});

test('each post keeps its own comment draft', async () => {
  renderApp();
  await user.type(screen.getByLabelText('Comment on Colocate state'), 'Nice');
  expect(screen.getByLabelText('Comment on Colocate state')).toHaveValue('Nice');
  expect(screen.getByLabelText('Comment on Promote with care')).toHaveValue('');
});

test('posting a comment adds it to that post and clears its draft', async () => {
  renderApp();
  await user.type(screen.getByLabelText('Comment on Promote with care'), 'Agreed');
  const article = within(screen.getByRole('article', { name: 'Promote with care' }));
  await user.click(article.getByRole('button', { name: 'Post comment' }));
  expect(article.getByRole('listitem')).toHaveTextContent('Agreed');
  expect(screen.getByLabelText('Comment on Promote with care')).toHaveValue('');
});

test('posts expand independently', async () => {
  renderApp();
  const first = within(screen.getByRole('article', { name: 'Colocate state' }));
  const second = within(screen.getByRole('article', { name: 'Promote with care' }));
  await user.click(first.getByRole('button', { name: 'Read more' }));
  await user.click(second.getByRole('button', { name: 'Read more' }));
  expect(first.getByText('Keep state as close as possible to where it is used.')).toBeInTheDocument();
  expect(second.getByText('Lift or globalize state only when a real consumer needs it.')).toBeInTheDocument();
});

test('typing a comment does not re-render the Header', async () => {
  renderApp();
  const { renderCounts } = modules['renderLog.js'];
  const before = renderCounts.Header;
  await user.type(screen.getByLabelText('Comment on Colocate state'), 'hello');
  await user.click(screen.getAllByRole('button', { name: 'Read more' })[0]);
  expect(renderCounts.Header).toBe(before);
});

test('the theme stays shared and the menu still opens and closes', async () => {
  renderApp();
  await user.click(screen.getByRole('button', { name: 'Theme: light' }));
  expect(screen.getByTestId('app')).toHaveAttribute('data-theme', 'dark');
  expect(screen.getByRole('button', { name: 'Theme: dark' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Menu' }));
  expect(screen.getByRole('navigation', { name: 'Main menu' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'true');
  await user.click(screen.getByRole('button', { name: 'Menu' }));
  expect(screen.queryByRole('navigation', { name: 'Main menu' })).toBeNull();
});
