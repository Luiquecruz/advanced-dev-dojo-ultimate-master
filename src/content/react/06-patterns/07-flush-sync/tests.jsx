const addTodo = async (title) => {
  await user.type(screen.getByLabelText('New todo'), title);
  await user.click(screen.getByRole('button', { name: 'Add' }));
};

test('adds the typed todo to the list and clears the input', async () => {
  const TodoList = mod.default;
  render(<TodoList />);
  await addTodo('Write tests');
  const items = screen.getAllByRole('listitem').map((item) => item.textContent);
  expect(items).toEqual(['Learn JSX', 'Master hooks', 'Write tests']);
  expect(screen.getByLabelText('New todo')).toHaveValue('');
});

test('ignores empty or whitespace-only text', async () => {
  const TodoList = mod.default;
  render(<TodoList />);
  await addTodo('   ');
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
});

test('focuses the NEW item right after adding it', async () => {
  const TodoList = mod.default;
  render(<TodoList />);
  await addTodo('Write tests');
  expect(screen.getByText('Write tests')).toHaveFocus();
});

test('keeps focusing the latest item on consecutive adds', async () => {
  const TodoList = mod.default;
  render(<TodoList />);
  await addTodo('Ship it');
  await addTodo('Celebrate');
  expect(screen.getByText('Celebrate')).toHaveFocus();
});

test('uses flushSync from react-dom', () => {
  expect(source).toMatch(/flushSync\s*\(\s*\(\s*\)\s*=>/);
});
