function formDataWith(title) {
  const formData = new FormData();
  formData.set('title', title);
  return formData;
}

test('addTodoAction rejects titles shorter than 3 characters and keeps the value', async () => {
  const result = await mod.addTodoAction(mod.initialState, formDataWith('  ab '));
  expect(result).toEqual({ status: 'error', message: 'Title must be at least 3 characters', title: 'ab' });
});

test('addTodoAction posts the todo and returns a success message', async () => {
  const result = await mod.addTodoAction(mod.initialState, formDataWith(' Write docs '));
  expect(result).toEqual({ status: 'success', message: 'Added "Write docs"', title: '' });
  const todos = await (await fetch('/api/todos')).json();
  expect(todos.map((todo) => todo.title)).toContain('Write docs');
});

test('submitting a valid title shows the status message and resets the input', async () => {
  const AddTodoForm = mod.AddTodoForm;
  render(<AddTodoForm />);
  await user.type(screen.getByLabelText('Title'), 'Ship forms');
  await user.click(screen.getByRole('button', { name: 'Add' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Added "Ship forms"');
  await waitFor(() => expect(screen.getByLabelText('Title')).toHaveValue(''));
});

test('an invalid title shows an alert and keeps what the user typed', async () => {
  const AddTodoForm = mod.AddTodoForm;
  render(<AddTodoForm />);
  await user.type(screen.getByLabelText('Title'), 'ab');
  await user.click(screen.getByRole('button', { name: 'Add' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Title must be at least 3 characters');
  expect(screen.getByLabelText('Title')).toHaveValue('ab');
});

test('the button is disabled and reads "Saving..." while the action is pending', async () => {
  mockApi('/api/todos', async ({ body }) => {
    await sleep(300);
    return { id: 9, title: body.title, completed: false };
  });
  const AddTodoForm = mod.AddTodoForm;
  render(<AddTodoForm />);
  await user.type(screen.getByLabelText('Title'), 'Slow save');
  await user.click(screen.getByRole('button', { name: 'Add' }));
  expect(await screen.findByRole('button', { name: 'Saving...' })).toBeDisabled();
  expect(await screen.findByRole('status')).toHaveTextContent('Added "Slow save"');
});

test('uses useActionState with a form action instead of onSubmit', () => {
  expect(source).toMatch(/useActionState\(\s*addTodoAction/);
  expect(source).toMatch(/action=\{\s*formAction\s*\}/);
  expect(source).not.toMatch(/onSubmit|preventDefault/);
});
