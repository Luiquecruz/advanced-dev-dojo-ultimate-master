const TASKS = [
  { id: 1, title: 'Learn JSX', done: true },
  { id: 2, title: 'Master hooks', done: false },
];

test('"added" returns a new array with the new task and leaves the old state untouched', () => {
  const next = mod.tasksReducer(TASKS, { type: 'added', title: 'Write tests' });
  expect(next).not.toBe(TASKS);
  expect(TASKS).toHaveLength(2);
  expect(next).toEqual([...TASKS, { id: 3, title: 'Write tests', done: false }]);
});

test('"toggled" flips only the matching task and keeps the other objects', () => {
  const next = mod.tasksReducer(TASKS, { type: 'toggled', id: 2 });
  expect(next[1]).toEqual({ id: 2, title: 'Master hooks', done: true });
  expect(TASKS[1].done).toBe(false);
  expect(next[0]).toBe(TASKS[0]);
});

test('"deleted" removes the task and unknown actions throw', () => {
  expect(mod.tasksReducer(TASKS, { type: 'deleted', id: 1 })).toEqual([TASKS[1]]);
  expect(() => mod.tasksReducer(TASKS, { type: 'renamed' })).toThrow();
});

test('adding a task through the form shows it and clears the input', async () => {
  const TaskBoard = mod.default;
  render(<TaskBoard />);
  expect(screen.getByText('2 left')).toBeInTheDocument();
  await user.type(screen.getByLabelText('New task'), 'Write tests');
  await user.click(screen.getByRole('button', { name: 'Add' }));
  expect(screen.getByRole('checkbox', { name: 'Write tests' })).not.toBeChecked();
  expect(screen.getByLabelText('New task')).toHaveValue('');
  expect(screen.getByText('3 left')).toBeInTheDocument();
});

test('toggling and deleting tasks update the list', async () => {
  const TaskBoard = mod.default;
  render(<TaskBoard />);
  await user.click(screen.getByRole('checkbox', { name: 'Master hooks' }));
  expect(screen.getByRole('checkbox', { name: 'Master hooks' })).toBeChecked();
  expect(screen.getByText('1 left')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Delete Ship a React app' }));
  expect(screen.queryByText('Ship a React app')).toBeNull();
  expect(screen.getByText('0 left')).toBeInTheDocument();
});
