const { Provider } = require('react-redux');

function renderScreen(ui) {
  const store = modules['store.js'].makeStore();
  render(<Provider store={store}>{ui}</Provider>);
  return store;
}

function countRequests() {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    calls.push(`${(init && init.method) || (typeof input === 'string' ? 'GET' : input.method)} ${url.replace(/^https?:\/\/[^/]+/, '')}`);
    return original(input, init);
  };
  return { calls, restore: () => (globalThis.fetch = original) };
}

test('makeStore() mounts the api reducer and middleware so endpoints can run', async () => {
  const { todosApi } = modules['api.js'];
  const store = modules['store.js'].makeStore();
  const result = await store.dispatch(todosApi.endpoints.getTodos.initiate());
  expect(result.data).toHaveLength(3);
  expect(store.getState().todosApi.queries).toBeDefined();
});

test('getTodos provides a LIST tag plus one tag per todo', async () => {
  const { todosApi } = modules['api.js'];
  const store = modules['store.js'].makeStore();
  const result = await store.dispatch(todosApi.endpoints.getTodos.initiate());
  const tags = todosApi.util.selectInvalidatedBy(store.getState(), [{ type: 'Todo', id: 2 }]);
  expect(tags.map((entry) => entry.endpointName)).toEqual(['getTodos']);
  const listTags = todosApi.util.selectInvalidatedBy(store.getState(), [{ type: 'Todo', id: 'LIST' }]);
  expect(listTags).toHaveLength(1);
  result.unsubscribe?.();
});

test('adding a todo invalidates the LIST tag and the list refetches', async () => {
  const { TodoList, AddTodo } = mod;
  renderScreen(
    <>
      <AddTodo />
      <TodoList />
    </>,
  );
  await screen.findByText('Learn JSX');
  await user.type(screen.getByLabelText('New todo'), 'Write RTK Query tests');
  await user.click(screen.getByRole('button', { name: 'Add' }));
  expect(await screen.findByRole('checkbox', { name: 'Write RTK Query tests' })).toBeInTheDocument();
  expect(screen.getByLabelText('New todo')).toHaveValue('');
});

test('toggling a todo sends a PATCH and the list shows the server value', async () => {
  const { TodoList } = mod;
  renderScreen(<TodoList />);
  await user.click(await screen.findByRole('checkbox', { name: 'Master hooks' }));
  await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Master hooks' })).toBeChecked());
});

test('updating todo 2 refetches the list and todo 2 only, not todo 3', async () => {
  const { TodoList, TodoDetail } = mod;
  const counter = countRequests();
  try {
    renderScreen(
      <>
        <TodoList />
        <TodoDetail id={2} />
        <TodoDetail id={3} />
      </>,
    );
    await waitFor(() => expect(screen.getByTestId('todo-2')).toHaveTextContent('Master hooks: open'));
    await waitFor(() => expect(screen.getByTestId('todo-3')).toHaveTextContent('Ship a React app: open'));
    await user.click(await screen.findByRole('checkbox', { name: 'Master hooks' }));
    await waitFor(() => expect(screen.getByTestId('todo-2')).toHaveTextContent('Master hooks: done'));
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Master hooks' })).toBeChecked());
    await act(() => sleep(50));
    const count = (entry) => counter.calls.filter((call) => call === entry).length;
    expect(count('GET /api/todos')).toBe(2);
    expect(count('GET /api/todos/2')).toBe(2);
    expect(count('GET /api/todos/3')).toBe(1);
  } finally {
    counter.restore();
  }
});
