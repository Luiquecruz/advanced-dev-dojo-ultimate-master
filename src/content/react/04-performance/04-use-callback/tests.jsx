test('toggles and deletes todos', async () => {
  const TodoList = mod.default;
  render(<TodoList />);
  const checkbox = screen.getByRole('checkbox', { name: 'Master hooks' });
  await user.click(checkbox);
  expect(checkbox).toBeChecked();
  await user.click(screen.getByRole('button', { name: 'Delete Learn JSX' }));
  expect(screen.queryByText('Learn JSX')).toBeNull();
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
});

test('typing in the draft input does NOT re-render any TodoItem', async () => {
  const TodoList = mod.default;
  const onItemRender = fn();
  render(<TodoList onItemRender={onItemRender} />);
  expect(onItemRender).toHaveBeenCalledTimes(3);
  await user.type(screen.getByRole('textbox', { name: 'New todo' }), 'abc');
  expect(screen.getByRole('textbox')).toHaveValue('abc');
  expect(onItemRender).toHaveBeenCalledTimes(3);
});

test('toggling one todo re-renders only that item', async () => {
  const TodoList = mod.default;
  const onItemRender = fn();
  render(<TodoList onItemRender={onItemRender} />);
  await user.click(screen.getByRole('checkbox', { name: 'Ship a React app' }));
  expect(onItemRender).toHaveBeenCalledTimes(4);
  expect(onItemRender).toHaveBeenLastCalledWith(3);
});

test('two quick toggles both apply (no stale state)', async () => {
  const TodoList = mod.default;
  render(<TodoList />);
  await user.click(screen.getByRole('checkbox', { name: 'Master hooks' }));
  await user.click(screen.getByRole('checkbox', { name: 'Ship a React app' }));
  expect(screen.getByRole('checkbox', { name: 'Master hooks' })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'Ship a React app' })).toBeChecked();
});

test('uses useCallback', () => {
  expect(source).toMatch(/useCallback\s*\(/);
});
