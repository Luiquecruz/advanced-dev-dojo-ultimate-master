const initialTodos = [
  { id: 1, title: 'Learn JSX', completed: true },
  { id: 2, title: 'Master hooks', completed: false },
];

async function submit(title) {
  await user.type(screen.getByLabelText('New todo'), title);
  await user.click(screen.getByRole('button', { name: 'Add' }));
}

test('renders the initial todos', () => {
  const TodoList = mod.default;
  render(<TodoList initialTodos={initialTodos} />);
  expect(screen.getAllByRole('listitem').map((item) => item.textContent.trim())).toEqual(['Learn JSX', 'Master hooks']);
});

test('shows the new todo immediately with "Saving..." before the server answers', async () => {
  mockApi('/api/todos', async ({ body }) => {
    await sleep(300);
    return { id: 10, title: body.title, completed: false };
  });
  const TodoList = mod.default;
  render(<TodoList initialTodos={initialTodos} />);
  await submit('Write docs');
  const items = await screen.findAllByRole('listitem');
  expect(items).toHaveLength(3);
  expect(items[2]).toHaveTextContent('Write docs');
  expect(items[2]).toHaveTextContent('Saving...');
});

test('keeps the confirmed todo without "Saving..." after the server answers', async () => {
  const TodoList = mod.default;
  render(<TodoList initialTodos={initialTodos} />);
  await submit('Ship it');
  await waitFor(() => expect(screen.queryByText('Saving...')).toBeNull());
  const items = screen.getAllByRole('listitem');
  expect(items).toHaveLength(3);
  expect(items[2]).toHaveTextContent('Ship it');
});

test('rolls back the optimistic todo and shows an alert when the request fails', async () => {
  mockApi('/api/todos', async () => {
    await sleep(150);
    return jsonResponse({ error: 'Nope' }, 500);
  });
  const TodoList = mod.default;
  render(<TodoList initialTodos={initialTodos} />);
  await submit('Doomed todo');
  expect(await screen.findByText('Doomed todo', { exact: false })).toBeInTheDocument();
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not add todo.');
  await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2));
  expect(screen.queryByText('Doomed todo', { exact: false })).toBeNull();
});

test('uses useOptimistic', () => {
  expect(source).toMatch(/useOptimistic\(\s*todos/);
});
