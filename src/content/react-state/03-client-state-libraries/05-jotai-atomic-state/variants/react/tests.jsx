const { createStore } = require('jotai');

const tasks = [
  { id: 1, title: 'Design atoms', done: true },
  { id: 2, title: 'Persist the filter', done: false },
  { id: 3, title: 'Scope each board', done: false },
];

function freshStorage() {
  localStorage.removeItem('task-filter');
}

test('visibleTasksAtom follows filterAtom and remainingCountAtom counts tasks not done', () => {
  freshStorage();
  const { tasksAtom, filterAtom, visibleTasksAtom, remainingCountAtom } = modules['atoms.js'];
  const store = createStore();
  store.set(tasksAtom, tasks);
  expect(store.get(visibleTasksAtom)).toHaveLength(3);
  store.set(filterAtom, 'done');
  expect(store.get(visibleTasksAtom).map((task) => task.id)).toEqual([1]);
  store.set(filterAtom, 'active');
  expect(store.get(visibleTasksAtom).map((task) => task.id)).toEqual([2, 3]);
  expect(store.get(remainingCountAtom)).toBe(2);
});

test('toggleTaskAtom flips one task immutably and clearDoneAtom removes done tasks', () => {
  freshStorage();
  const { tasksAtom, toggleTaskAtom, clearDoneAtom, remainingCountAtom } = modules['atoms.js'];
  const store = createStore();
  store.set(tasksAtom, tasks);
  const before = store.get(tasksAtom);
  store.set(toggleTaskAtom, 2);
  const after = store.get(tasksAtom);
  expect(after).not.toBe(before);
  expect(after[1].done).toBe(true);
  expect(tasks[1].done).toBe(false);
  expect(store.get(remainingCountAtom)).toBe(1);
  store.set(clearDoneAtom);
  expect(store.get(tasksAtom).map((task) => task.id)).toEqual([3]);
});

test('filterAtom is persisted in localStorage under "task-filter"', () => {
  freshStorage();
  const { filterAtom } = modules['atoms.js'];
  const store = createStore();
  expect(store.get(filterAtom)).toBe('all');
  store.set(filterAtom, 'done');
  expect(localStorage.getItem('task-filter')).toBe(JSON.stringify('done'));
  freshStorage();
});

test('the filter buttons and checkboxes update the list and the remaining count', async () => {
  freshStorage();
  const { TaskBoard } = mod;
  render(<TaskBoard initialTasks={tasks} />);
  expect(screen.getByTestId('remaining')).toHaveTextContent('2 remaining');
  await user.click(screen.getByRole('checkbox', { name: 'Persist the filter' }));
  expect(screen.getByTestId('remaining')).toHaveTextContent('1 remaining');
  await user.click(screen.getByRole('button', { name: 'Done' }));
  expect(screen.getByRole('button', { name: 'Done' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getAllByRole('checkbox')).toHaveLength(2);
  expect(screen.queryByRole('checkbox', { name: 'Scope each board' })).toBeNull();
  freshStorage();
});

test('each TaskBoard has its own store seeded with its initialTasks', async () => {
  freshStorage();
  const { TaskBoard } = mod;
  render(
    <div>
      <div data-testid="first"><TaskBoard initialTasks={tasks} /></div>
      <div data-testid="second"><TaskBoard initialTasks={[{ id: 9, title: 'Other board task', done: false }]} /></div>
    </div>,
  );
  const first = within(screen.getByTestId('first'));
  const second = within(screen.getByTestId('second'));
  expect(first.getAllByRole('checkbox')).toHaveLength(3);
  expect(second.getAllByRole('checkbox')).toHaveLength(1);
  await user.click(first.getByRole('checkbox', { name: 'Scope each board' }));
  expect(first.getByTestId('remaining')).toHaveTextContent('1 remaining');
  expect(second.getByTestId('remaining')).toHaveTextContent('1 remaining');
  expect(second.getByRole('checkbox', { name: 'Other board task' })).not.toBeChecked();
});

test('a filter saved in localStorage is restored when the board mounts', async () => {
  freshStorage();
  localStorage.setItem('task-filter', JSON.stringify('active'));
  const { TaskBoard } = mod;
  render(<TaskBoard initialTasks={tasks} />);
  await waitFor(() => expect(screen.getAllByRole('checkbox')).toHaveLength(2));
  expect(screen.getByRole('button', { name: 'Active' })).toHaveAttribute('aria-pressed', 'true');
  freshStorage();
});
