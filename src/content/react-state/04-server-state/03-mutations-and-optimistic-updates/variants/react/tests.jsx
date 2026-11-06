const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');

function renderList() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const TodoList = mod.TodoList;
  render(
    <QueryClientProvider client={client}>
      <TodoList />
    </QueryClientProvider>,
  );
  return client;
}

function slowRoute(path, response) {
  const calls = [];
  mockApi(path, async ({ method, body }) => {
    calls.push({ method, body });
    await sleep(400);
    return response;
  });
  return calls;
}

test('toggling shows the new value before the server answers', async () => {
  const calls = slowRoute('/api/todos/2', { id: 2, title: 'Master hooks', completed: true });
  const client = renderList();
  await user.click(await screen.findByRole('checkbox', { name: 'Master hooks' }));
  await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Master hooks' })).toBeChecked(), { timeout: 150 });
  expect(client.getQueryData(['todos']).find((todo) => todo.id === 2).completed).toBe(true);
  await waitFor(() => expect(calls).toEqual([{ method: 'PATCH', body: { completed: true } }]));
});

test('a failed toggle rolls back to the previous value and shows an alert', async () => {
  mockApi('/api/todos/2', () => jsonResponse({ error: 'Nope' }, 500));
  renderList();
  await user.click(await screen.findByRole('checkbox', { name: 'Master hooks' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not save your change');
  await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Master hooks' })).not.toBeChecked());
});

test('deleting removes the todo before the server answers', async () => {
  slowRoute('/api/todos/3', { ok: true });
  renderList();
  await user.click(await screen.findByRole('button', { name: 'Delete Ship a React app' }));
  await waitFor(() => expect(screen.queryByText('Ship a React app')).toBeNull(), { timeout: 150 });
  expect(screen.getAllByRole('checkbox')).toHaveLength(2);
});

test('a failed delete puts the todo back and shows an alert', async () => {
  mockApi('/api/todos/3', () => jsonResponse({ error: 'Nope' }, 500));
  renderList();
  await user.click(await screen.findByRole('button', { name: 'Delete Ship a React app' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not save your change');
  expect(await screen.findByText('Ship a React app')).toBeInTheDocument();
  expect(screen.getAllByRole('checkbox')).toHaveLength(3);
});

test('cancels in-flight ["todos"] queries before writing and invalidates them when settled', async () => {
  const client = renderList();
  await screen.findByText('Learn JSX');
  const cancelled = fn();
  const invalidated = fn();
  const originalCancel = client.cancelQueries.bind(client);
  const originalInvalidate = client.invalidateQueries.bind(client);
  client.cancelQueries = (...args) => {
    cancelled(...args);
    return originalCancel(...args);
  };
  client.invalidateQueries = (...args) => {
    invalidated(...args);
    return originalInvalidate(...args);
  };
  await user.click(screen.getByRole('checkbox', { name: 'Master hooks' }));
  await waitFor(() => expect(invalidated).toHaveBeenCalled());
  expect(cancelled).toHaveBeenCalled();
  expect(cancelled.mock.calls[0][0].queryKey).toEqual(['todos']);
  expect(invalidated.mock.calls[0][0].queryKey).toEqual(['todos']);
});
