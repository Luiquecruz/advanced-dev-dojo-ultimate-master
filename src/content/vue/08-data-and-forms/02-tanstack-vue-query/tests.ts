const { QueryClient, VueQueryPlugin } = require('@tanstack/vue-query');

function renderApp(queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  render(mod.default, { global: { plugins: [[VueQueryPlugin, { queryClient }]] } });
  return queryClient;
}

test('shows "Loading todos…" and then one <li> per todo', async () => {
  renderApp();
  expect(screen.getByText('Loading todos…')).toBeInTheDocument();
  expect(await screen.findByText('Master hooks')).toBeInTheDocument();
  expect(screen.getAllByRole('listitem')).toHaveLength(3);
});

test('shows "Could not load todos." in role="alert" when the request fails', async () => {
  mockApi('/api/todos', () => jsonResponse({ error: 'boom' }, 500));
  renderApp();
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load todos.');
});

test('caches the todos under the ["todos"] query key', async () => {
  const queryClient = renderApp();
  await screen.findByText('Master hooks');
  const cached = queryClient.getQueryData(['todos']);
  expect(cached).toHaveLength(3);
});

test('adding a todo posts it, clears the input and refetches the list', async () => {
  renderApp();
  await screen.findByText('Master hooks');
  await user.type(screen.getByLabelText('New todo'), 'Learn Vue Query');
  await user.click(screen.getByRole('button', { name: 'Add' }));
  expect(await screen.findByText('Learn Vue Query')).toBeInTheDocument();
  expect(screen.getAllByRole('listitem')).toHaveLength(4);
  expect(screen.getByLabelText('New todo')).toHaveValue('');
});

test('uses useQuery, useMutation and invalidateQueries', () => {
  expect(sources['App.vue']).toMatch(/useQuery\s*\(/);
  expect(sources['App.vue']).toMatch(/useMutation\s*\(/);
  expect(sources['App.vue']).toMatch(/invalidateQueries\s*\(/);
});
