test('AddTask and TaskList share the same tasks through the provider', async () => {
  const App = mod.default;
  render(<App />);
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
  await user.type(screen.getByLabelText('New task'), 'Eat ramen');
  await user.click(screen.getByRole('button', { name: 'Add' }));
  expect(screen.getByText('Eat ramen')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Delete Drink matcha' }));
  expect(screen.queryByText('Drink matcha')).toBeNull();
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
});

test('useTasks throws a helpful error outside TasksProvider', () => {
  expect(() => renderHook(() => mod.useTasks())).toThrow(/TasksProvider/);
});

test('useTasksDispatch throws a helpful error outside TasksProvider', () => {
  expect(() => renderHook(() => mod.useTasksDispatch())).toThrow(/TasksProvider/);
});

test('a component that only dispatches does not re-render when tasks change', async () => {
  const { TasksProvider, AddTask, TaskList, useTasksDispatch } = mod;
  const renders = fn();
  const DispatchOnly = React.memo(function DispatchOnly() {
    useTasksDispatch();
    renders();
    return null;
  });
  render(
    <TasksProvider>
      <DispatchOnly />
      <AddTask />
      <TaskList />
    </TasksProvider>,
  );
  await user.type(screen.getByLabelText('New task'), 'Eat ramen');
  await user.click(screen.getByRole('button', { name: 'Add' }));
  expect(screen.getByText('Eat ramen')).toBeInTheDocument();
  expect(renders).toHaveBeenCalledTimes(1);
});

test('dispatch keeps the same identity across updates', () => {
  const { TasksProvider, useTasks, useTasksDispatch } = mod;
  const { result } = renderHook(() => ({ tasks: useTasks(), dispatch: useTasksDispatch() }), { wrapper: TasksProvider });
  const firstDispatch = result.current.dispatch;
  act(() => {
    result.current.dispatch({ type: 'added', title: 'Eat ramen' });
  });
  expect(result.current.tasks).toHaveLength(3);
  expect(result.current.dispatch).toBe(firstDispatch);
});
