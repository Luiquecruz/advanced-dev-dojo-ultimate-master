test('todosReducer handles added, toggled and cleared', () => {
  const { todosReducer } = mod;
  const one = todosReducer([], { type: 'added', title: 'Learn TS' });
  expect(one).toEqual([{ id: 1, title: 'Learn TS', done: false }]);
  const two = todosReducer(one, { type: 'added', title: 'Type hooks' });
  expect(two[1]).toEqual({ id: 2, title: 'Type hooks', done: false });
  const toggled = todosReducer(two, { type: 'toggled', id: 1 });
  expect(toggled[0].done).toBe(true);
  expect(two[0].done).toBe(false);
  expect(todosReducer(toggled, { type: 'cleared' })).toEqual([{ id: 2, title: 'Type hooks', done: false }]);
});

test('submitting adds the todo, clears the input and focuses it again', async () => {
  const TodoApp = mod.default;
  render(<TodoApp />);
  const input = screen.getByLabelText('Title');
  await user.type(input, '  Write types  ');
  await user.click(screen.getByRole('button', { name: 'Add' }));
  expect(screen.getAllByRole('listitem').map((item) => item.textContent.trim())).toEqual(['Write types']);
  expect(input).toHaveValue('');
  expect(input).toHaveFocus();
});

test('toggling a todo and "Clear completed" removes it', async () => {
  const TodoApp = mod.default;
  render(<TodoApp />);
  await user.type(screen.getByLabelText('Title'), 'First{Enter}');
  await user.type(screen.getByLabelText('Title'), 'Second{Enter}');
  const checkbox = screen.getByRole('checkbox', { name: 'First' });
  await user.click(checkbox);
  expect(checkbox).toBeChecked();
  await user.click(screen.getByRole('button', { name: 'Clear completed' }));
  expect(screen.queryByText('First')).toBeNull();
  expect(screen.getByRole('checkbox', { name: 'Second' })).not.toBeChecked();
});

test('types the ref and the event handlers', () => {
  expect(source).toMatch(/useRef<\s*HTMLInputElement\s*>\(\s*null\s*\)/);
  expect(source).toMatch(/ChangeEvent<\s*HTMLInputElement\s*>/);
  expect(source).toMatch(/(Submit|Form)Event<\s*HTMLFormElement\s*>/);
  expect(source).not.toMatch(/:\s*any\b/);
});

test('declares a discriminated Action union and an exhaustive reducer', () => {
  expect(source).toMatch(/type\s*:\s*['"]added['"]\s*;?\s*title\s*:\s*string/);
  expect(source).toMatch(/type\s*:\s*['"]toggled['"]\s*;?\s*id\s*:\s*number/);
  expect(source).toMatch(/type\s*:\s*['"]cleared['"]/);
  expect(source).toMatch(/todosReducer\s*\(\s*state\s*:\s*Todo\[\]\s*,\s*action\s*:\s*Action\s*\)\s*:\s*Todo\[\]/);
  expect(source).toMatch(/:\s*never\s*=\s*action/);
});
