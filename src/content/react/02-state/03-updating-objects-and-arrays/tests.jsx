const createTodos = () => [
  { id: 1, title: 'Learn JSX', completed: true },
  { id: 2, title: 'Master hooks', completed: false },
];
const titles = () => screen.getAllByRole('listitem').map((item) => item.querySelector('label').textContent.trim());

test('adds a new todo to the end of the list and clears the input', async () => {
  const TodoList = mod.default;
  render(<TodoList initialTodos={createTodos()} />);
  const input = screen.getByRole('textbox', { name: 'New todo' });
  await user.type(input, '  Write tests  ');
  await user.click(screen.getByRole('button', { name: 'Add' }));
  expect(titles()).toEqual(['Learn JSX', 'Master hooks', 'Write tests']);
  expect(screen.getByRole('checkbox', { name: 'Write tests' })).not.toBeChecked();
  expect(input).toHaveValue('');
});

test('ignores blank titles', async () => {
  const TodoList = mod.default;
  render(<TodoList initialTodos={createTodos()} />);
  await user.type(screen.getByRole('textbox', { name: 'New todo' }), '   ');
  await user.click(screen.getByRole('button', { name: 'Add' }));
  expect(titles()).toEqual(['Learn JSX', 'Master hooks']);
});

test('toggles a todo when its checkbox is clicked', async () => {
  const TodoList = mod.default;
  render(<TodoList initialTodos={createTodos()} />);
  await user.click(screen.getByRole('checkbox', { name: 'Master hooks' }));
  expect(screen.getByRole('checkbox', { name: 'Master hooks' })).toBeChecked();
  await user.click(screen.getByRole('checkbox', { name: 'Learn JSX' }));
  expect(screen.getByRole('checkbox', { name: 'Learn JSX' })).not.toBeChecked();
});

test('deletes a todo', async () => {
  const TodoList = mod.default;
  render(<TodoList initialTodos={createTodos()} />);
  await user.click(screen.getByRole('button', { name: 'Delete Learn JSX' }));
  expect(titles()).toEqual(['Master hooks']);
});

test('never mutates the initialTodos array or its objects', async () => {
  const TodoList = mod.default;
  const initialTodos = createTodos();
  render(<TodoList initialTodos={initialTodos} />);
  await user.type(screen.getByRole('textbox', { name: 'New todo' }), 'Write tests');
  await user.click(screen.getByRole('button', { name: 'Add' }));
  await user.click(screen.getByRole('checkbox', { name: 'Master hooks' }));
  await user.click(screen.getByRole('button', { name: 'Delete Learn JSX' }));
  expect(initialTodos).toEqual(createTodos());
});
