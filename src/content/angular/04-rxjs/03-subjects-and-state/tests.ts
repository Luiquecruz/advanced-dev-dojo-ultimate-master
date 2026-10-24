function createStore() {
  return TestBed.inject(modules['todo-store.ts'].TodoStore);
}

test('todos$ replays the current list to late subscribers and hides next()', () => {
  const store = createStore();
  store.add('Learn RxJS');
  let received = null;
  store.todos$.subscribe((todos) => (received = todos));
  expect(received).toEqual([{ id: 1, title: 'Learn RxJS', completed: false }]);
  expect(typeof store.todos$.next).toBe('undefined');
});

test('add() and toggle() emit new arrays instead of mutating', () => {
  const store = createStore();
  const snapshots = [];
  store.todos$.subscribe((todos) => snapshots.push(todos));
  store.add('A');
  store.add('B');
  store.toggle(2);
  expect(snapshots).toHaveLength(4);
  expect(snapshots[1]).toEqual([{ id: 1, title: 'A', completed: false }]);
  expect(snapshots[2]).not.toBe(snapshots[1]);
  expect(snapshots[3][1]).toEqual({ id: 2, title: 'B', completed: true });
  expect(snapshots[2][1].completed).toBe(false);
});

test('remaining$ counts todos that are not completed', () => {
  const store = createStore();
  const counts = [];
  store.remaining$.subscribe((count) => counts.push(count));
  store.add('A');
  store.add('B');
  store.toggle(1);
  expect(counts).toEqual([0, 1, 2, 1]);
});

test('adding and toggling todos in the component updates the list and counter', async () => {
  await render(mod.TodoList);
  const input = screen.getByRole('textbox', { name: 'New todo' });
  await user.type(input, 'Write tests');
  await user.click(screen.getByRole('button', { name: 'Add' }));
  await user.type(input, 'Ship');
  await user.click(screen.getByRole('button', { name: 'Add' }));
  await stable();
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
  expect(screen.getByText('2 remaining')).toBeInTheDocument();
  expect(input).toHaveValue('');
  await user.click(screen.getByText('Write tests'));
  await stable();
  expect(screen.getByText('1 remaining')).toBeInTheDocument();
});

test('the store uses a BehaviorSubject exposed through asObservable()', () => {
  const store = sources['todo-store.ts'];
  expect(store).toMatch(/new\s+BehaviorSubject/);
  expect(store).toMatch(/asObservable\(\)/);
});
