const { createPinia, setActivePinia } = require('pinia');
const { useTodosStore } = modules['store.ts'];

function freshStore() {
  setActivePinia(createPinia());
  return useTodosStore();
}

test('fetchTodos loads the todos and toggles loading', async () => {
  const store = freshStore();
  const pending = store.fetchTodos();
  expect(store.loading).toBe(true);
  await pending;
  expect(store.loading).toBe(false);
  expect(store.todos.map((todo: { title: string }) => todo.title)).toEqual(['Learn JSX', 'Master hooks', 'Ship a React app']);
});

test('remaining counts todos that are not completed and toggle flips one', async () => {
  const store = freshStore();
  await store.fetchTodos();
  expect(store.remaining).toBe(2);
  store.toggle(2);
  expect(store.remaining).toBe(1);
});

test('a failed request sets error to "Failed to load todos"', async () => {
  mockApi('/api/todos', () => jsonResponse({ error: 'boom' }, 500));
  const store = freshStore();
  await store.fetchTodos();
  expect(store.error).toBe('Failed to load todos');
  expect(store.loading).toBe(false);
});

test('the setup store implements its own $reset()', async () => {
  const store = freshStore();
  await store.fetchTodos();
  store.$reset();
  expect(store.todos).toEqual([]);
  expect(store.error).toBeNull();
});

test('the component lists todos and updates "N remaining" when a checkbox is clicked', async () => {
  render(mod.default, { global: { plugins: [createPinia()] } });
  expect(await screen.findByText('2 remaining')).toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: 'Learn JSX' })).toBeChecked();
  await user.click(screen.getByRole('checkbox', { name: 'Master hooks' }));
  expect(screen.getByText('1 remaining')).toBeInTheDocument();
});

test('the component shows the error in role="alert"', async () => {
  mockApi('/api/todos', () => jsonResponse({ error: 'boom' }, 500));
  render(mod.default, { global: { plugins: [createPinia()] } });
  expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load todos');
});
