const { Provider } = require('react-redux');

function renderTodoApp() {
  const store = modules['store.js'].makeStore();
  const TodoApp = mod.TodoApp;
  render(
    <Provider store={store}>
      <TodoApp />
    </Provider>,
  );
  return store;
}

test('todoAdded prepares a payload with a generated id and completed: false', () => {
  const { todoAdded } = modules['todosSlice.js'];
  const action = todoAdded('Learn RTK');
  expect(action.type).toBe('todos/todoAdded');
  expect(action.payload.title).toBe('Learn RTK');
  expect(action.payload.completed).toBe(false);
  expect(typeof action.payload.id).toBe('string');
  expect(todoAdded('Learn RTK').payload.id).not.toBe(action.payload.id);
});

test('makeStore registers the slice under "todos" and the reducers update it', () => {
  const { todoAdded, todoToggled, completedCleared, selectTodos, selectRemainingCount } = modules['todosSlice.js'];
  const store = modules['store.js'].makeStore();
  expect(store.getState().todos).toEqual({ items: [] });
  store.dispatch(todoAdded('Write reducers'));
  store.dispatch(todoAdded('Write selectors'));
  const [first] = selectTodos(store.getState());
  store.dispatch(todoToggled(first.id));
  expect(selectRemainingCount(store.getState())).toBe(1);
  store.dispatch(completedCleared());
  expect(selectTodos(store.getState()).map((todo) => todo.title)).toEqual(['Write selectors']);
});

test('adding a todo through the form renders it and updates "N remaining"', async () => {
  renderTodoApp();
  await user.type(screen.getByLabelText('New todo'), 'Learn Redux Toolkit');
  await user.click(screen.getByRole('button', { name: 'Add' }));
  expect(screen.getByRole('checkbox', { name: 'Learn Redux Toolkit' })).toBeInTheDocument();
  expect(screen.getByTestId('remaining').textContent).toBe('1 remaining');
  expect(screen.getByLabelText('New todo')).toHaveValue('');
});

test('toggling a checkbox dispatches todoToggled and "Clear completed" removes it', async () => {
  const store = renderTodoApp();
  await user.type(screen.getByLabelText('New todo'), 'Done soon');
  await user.click(screen.getByRole('button', { name: 'Add' }));
  await user.click(screen.getByRole('checkbox', { name: 'Done soon' }));
  expect(screen.getByRole('checkbox', { name: 'Done soon' })).toBeChecked();
  expect(screen.getByTestId('remaining').textContent).toBe('0 remaining');
  await user.click(screen.getByRole('button', { name: 'Clear completed' }));
  expect(screen.queryByRole('checkbox')).toBeNull();
  expect(store.getState().todos.items).toEqual([]);
});

test('the default App provides a store to TodoApp', async () => {
  const App = mod.default;
  render(<App />);
  await user.type(screen.getByLabelText('New todo'), 'Provided');
  await user.click(screen.getByRole('button', { name: 'Add' }));
  expect(screen.getByRole('checkbox', { name: 'Provided' })).toBeInTheDocument();
});

test('uses Redux Toolkit APIs instead of the legacy createStore', () => {
  expect(sources['store.js']).toMatch(/configureStore\(/);
  expect(sources['todosSlice.js']).toMatch(/createSlice\(/);
  expect(sources['todosSlice.js']).toMatch(/prepare\s*\(/);
  expect(sources['store.js']).not.toMatch(/\bcreateStore\(/);
});
