const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const TodosPage = mod.TodosPage;
  render(
    <QueryClientProvider client={client}>
      <TodosPage />
    </QueryClientProvider>,
  );
  return client;
}

test('lists the todos from the server', async () => {
  renderPage();
  expect(await screen.findByRole('checkbox', { name: 'Learn JSX' })).toBeChecked();
  expect(screen.getAllByRole('checkbox')).toHaveLength(3);
});

test('adding a todo posts it and the refetched list shows it', async () => {
  renderPage();
  await screen.findByText('Learn JSX');
  await user.type(screen.getByLabelText('New todo'), 'Write tests');
  await user.click(screen.getByRole('button', { name: 'Add todo' }));
  expect(await screen.findByRole('checkbox', { name: 'Write tests' })).toBeInTheDocument();
  expect(screen.getAllByRole('checkbox')).toHaveLength(4);
  expect(screen.getByLabelText('New todo')).toHaveValue('');
});

test('the submit button is disabled and reads "Adding..." while the mutation is pending', async () => {
  mockApi('/api/todos', async ({ method, body }) => {
    if (method === 'POST') {
      await sleep(300);
      return { id: 4, title: body.title, completed: false };
    }
    return [{ id: 1, title: 'Learn JSX', completed: true }];
  });
  renderPage();
  await screen.findByText('Learn JSX');
  await user.type(screen.getByLabelText('New todo'), 'Slow one');
  await user.click(screen.getByRole('button', { name: 'Add todo' }));
  expect(await screen.findByRole('button', { name: 'Adding...' })).toBeDisabled();
});

test('invalidates the ["todos"] query after a successful mutation', async () => {
  const client = renderPage();
  await screen.findByText('Learn JSX');
  const spy = fn();
  const original = client.invalidateQueries.bind(client);
  client.invalidateQueries = (...args) => {
    spy(...args);
    return original(...args);
  };
  await user.type(screen.getByLabelText('New todo'), 'Invalidate me');
  await user.click(screen.getByRole('button', { name: 'Add todo' }));
  await screen.findByText('Invalidate me');
  expect(spy).toHaveBeenCalled();
  expect(spy.mock.calls[0][0].queryKey).toEqual(['todos']);
});

test('toggling a checkbox sends a PATCH and updates the cached todo', async () => {
  const client = renderPage();
  const checkbox = await screen.findByRole('checkbox', { name: 'Master hooks' });
  expect(checkbox).not.toBeChecked();
  await user.click(checkbox);
  await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Master hooks' })).toBeChecked());
  expect(client.getQueryData(['todos']).find((todo) => todo.id === 2).completed).toBe(true);
});
