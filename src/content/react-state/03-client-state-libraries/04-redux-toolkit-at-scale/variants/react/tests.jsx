const todosFile = () => modules['todosSlice.js'];
const makeStore = () => modules['store.js'].makeStore();
const seed = [
  { id: 1, title: 'Learn JSX', completed: true },
  { id: 2, title: 'Master hooks', completed: false },
  { id: 3, title: 'Ship a React app', completed: false },
];

test('fetchTodos stores the todos normalized by the entity adapter', async () => {
  const { fetchTodos, selectAllTodos, selectTodoById, selectTodoCount } = todosFile();
  const store = makeStore();
  const pending = store.dispatch(fetchTodos());
  expect(store.getState().todos.status).toBe('loading');
  await pending;
  const state = store.getState();
  expect(state.todos.status).toBe('succeeded');
  expect(state.todos.ids).toEqual([1, 2, 3]);
  expect(state.todos.entities[2].title).toBe('Master hooks');
  expect(selectAllTodos(state).map((todo) => todo.title)).toEqual(['Learn JSX', 'Master hooks', 'Ship a React app']);
  expect(selectTodoById(state, 3).title).toBe('Ship a React app');
  expect(selectTodoCount(state)).toBe(3);
});

test('fetchTodos is skipped while a request is already in flight (condition)', async () => {
  const { fetchTodos } = todosFile();
  const handler = fn(() => seed);
  mockApi('/api/todos', handler);
  const store = makeStore();
  const first = store.dispatch(fetchTodos());
  const second = store.dispatch(fetchTodos());
  const results = await Promise.all([first, second]);
  expect(handler).toHaveBeenCalledTimes(1);
  expect(results[1].meta.condition).toBe(true);
  expect(store.getState().todos.ids).toEqual([1, 2, 3]);
});

test('a failed request sets status "failed" and stores the error message', async () => {
  const { fetchTodos } = todosFile();
  mockApi('/api/todos', () => jsonResponse({ error: 'down' }, 500));
  const store = makeStore();
  await store.dispatch(fetchTodos());
  expect(store.getState().todos.status).toBe('failed');
  expect(store.getState().todos.error).toBe('Failed to load todos');
});

test('toggling updates the store immediately and the listener saves it with a PATCH', async () => {
  const { fetchTodos, todoToggled } = todosFile();
  const handler = fn(({ body }) => ({ id: 2, title: 'Master hooks', ...body }));
  mockApi('/api/todos/2', handler);
  const store = makeStore();
  store.dispatch(fetchTodos.fulfilled(seed, 'seed'));
  store.dispatch(todoToggled(2));
  expect(store.getState().todos.entities[2].completed).toBe(true);
  await waitFor(() => expect(handler).toHaveBeenCalledTimes(1));
  expect(handler.mock.calls[0][0].method).toBe('PATCH');
  expect(handler.mock.calls[0][0].body).toEqual({ completed: true });
  await sleep(20);
  expect(store.getState().todos.entities[2].completed).toBe(true);
  expect(store.getState().notifications).toEqual([]);
});

test('a failed save reverts the toggle and adds a notification', async () => {
  const { fetchTodos, todoToggled } = todosFile();
  mockApi('/api/todos/3', () => jsonResponse({ error: 'conflict' }, 409));
  const store = makeStore();
  store.dispatch(fetchTodos.fulfilled(seed, 'seed'));
  store.dispatch(todoToggled(3));
  expect(store.getState().todos.entities[3].completed).toBe(true);
  await waitFor(() => expect(store.getState().notifications).toHaveLength(1));
  expect(store.getState().notifications[0].message).toBe('Could not save "Ship a React app"');
  expect(store.getState().todos.entities[3].completed).toBe(false);
});

test('the app loads the todos, toggles one and shows the remaining count', async () => {
  const App = mod.default;
  render(<App />);
  expect(screen.getByRole('status')).toHaveTextContent('Loading todos...');
  const checkbox = await screen.findByRole('checkbox', { name: 'Master hooks' });
  expect(screen.getByTestId('remaining')).toHaveTextContent('2 remaining');
  await user.click(checkbox);
  expect(screen.getByRole('checkbox', { name: 'Master hooks' })).toBeChecked();
  expect(screen.getByTestId('remaining')).toHaveTextContent('1 remaining');
});
