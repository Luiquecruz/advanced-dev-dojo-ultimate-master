test('addTodo returns an error state for a blank title without calling the API', async () => {
  const calls = [];
  mockApi('/api/todos', ({ method }) => {
    calls.push(method);
    return { id: 99, title: 'unexpected' };
  });
  const formData = new FormData();
  formData.set('title', '   ');
  const previous = { todos: [{ id: 1, title: 'Learn JSX' }], error: null };
  const next = await mod.addTodo(previous, formData);
  expect(next).toEqual({ todos: [{ id: 1, title: 'Learn JSX' }], error: 'Title is required.' });
  expect(calls).toHaveLength(0);
});

test('addTodo POSTs the title and appends the created todo', async () => {
  const requests = [];
  mockApi('/api/todos', ({ method, body }) => {
    requests.push({ method, body });
    return { id: 42, title: body.title, completed: false };
  });
  const formData = new FormData();
  formData.set('title', '  Write tests ');
  const next = await mod.addTodo({ todos: [], error: 'old' }, formData);
  expect(requests).toEqual([{ method: 'POST', body: { title: 'Write tests' } }]);
  expect(next).toEqual({ todos: [{ id: 42, title: 'Write tests', completed: false }], error: null });
});

test('submitting the form shows the new todo in the list', async () => {
  const AddTodoForm = mod.default;
  render(<AddTodoForm />);
  await user.type(screen.getByLabelText('Title'), 'Learn useActionState');
  await user.click(screen.getByRole('button', { name: 'Add todo' }));
  expect(await screen.findByRole('listitem')).toHaveTextContent('Learn useActionState');
});

test('submitting an empty title shows "Title is required."', async () => {
  const AddTodoForm = mod.default;
  render(<AddTodoForm />);
  await user.click(screen.getByRole('button', { name: 'Add todo' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Title is required.');
});

test('disables the submit button while the action is pending', async () => {
  mockApi('/api/todos', async ({ body }) => {
    await sleep(200);
    return { id: 7, title: body.title, completed: false };
  });
  const AddTodoForm = mod.default;
  render(<AddTodoForm />);
  await user.type(screen.getByLabelText('Title'), 'Slow todo');
  await user.click(screen.getByRole('button', { name: 'Add todo' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Add todo' })).toBeDisabled());
  await screen.findByRole('listitem');
  expect(screen.getByRole('button', { name: 'Add todo' })).toBeEnabled();
});

test('uses useActionState and passes the form action to <form action>', () => {
  expect(source).toMatch(/useActionState\(\s*addTodo/);
  expect(source).toMatch(/<form[^>]*\baction=\{/);
});
