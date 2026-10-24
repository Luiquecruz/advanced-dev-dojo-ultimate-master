test('disables the button and shows "Saving..." while the Action is pending', async () => {
  mockApi('/todos/2', async ({ body }) => {
    await sleep(200);
    return { id: 2, title: body.title, completed: false };
  });
  const RenameTodo = mod.default;
  render(<RenameTodo />);
  await user.type(screen.getByLabelText('New title'), 'Learn Actions');
  await user.click(screen.getByRole('button', { name: 'Save' }));
  const button = screen.getByRole('button');
  expect(button).toHaveTextContent('Saving...');
  expect(button).toBeDisabled();
  expect(await screen.findByRole('button', { name: 'Save' })).toBeEnabled();
});

test('sends PATCH /api/todos/{todoId} with the title as JSON', async () => {
  const requests = [];
  mockApi('/todos/3', ({ method, body }) => {
    requests.push({ method, body });
    return { id: 3, title: body.title, completed: false };
  });
  const RenameTodo = mod.default;
  render(<RenameTodo todoId={3} />);
  await user.type(screen.getByLabelText('New title'), 'Ship it');
  await user.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(requests).toHaveLength(1));
  expect(requests[0]).toEqual({ method: 'PATCH', body: { title: 'Ship it' } });
});

test('shows "Saved: {title}" with the title returned by the server', async () => {
  const RenameTodo = mod.default;
  render(<RenameTodo />);
  await user.type(screen.getByLabelText('New title'), 'Master Actions');
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Saved: Master Actions');
});

test('shows an alert when the server answers with an error status', async () => {
  mockApi('/todos/2', () => jsonResponse({ error: 'Boom' }, 500));
  const RenameTodo = mod.default;
  render(<RenameTodo />);
  await user.type(screen.getByLabelText('New title'), 'Broken');
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not save the title.');
  expect(screen.queryByRole('status')).toBeNull();
});

test('uses useTransition with an async startTransition callback', () => {
  expect(source).toMatch(/useTransition\(\s*\)/);
  expect(source).toMatch(/startTransition\(\s*async/);
  expect(source).not.toMatch(/isSaving/);
});
