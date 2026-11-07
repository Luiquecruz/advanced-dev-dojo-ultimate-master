const todos = () => [
  { id: 1, title: 'One', completed: false },
  { id: 2, title: 'Two', completed: false },
];
const setup = (save) => {
  TestBed.configureTestingModule({ providers: [{ provide: mod.SAVE_TODO, useValue: save }] });
  const store = TestBed.inject(mod.TodoStore);
  store.load(todos());
  return store;
};
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  promise.catch(() => undefined);
  return { promise, resolve, reject };
};

test('toggle() changes the todo before the save finishes', async () => {
  const gate = deferred();
  const save = fn(() => gate.promise);
  const store = setup(save);
  const before = store.todos();
  const pending = store.toggle(1);
  expect(store.todos()[0].completed).toBe(true);
  expect(store.todos()).not.toBe(before);
  expect(before[0].completed).toBe(false);
  expect(save).toHaveBeenCalledWith({ id: 1, title: 'One', completed: true });
  gate.resolve();
  await pending;
  expect(store.todos()[0].completed).toBe(true);
  expect(store.error()).toBeNull();
});

test('a failed save rolls the todo back and reports the error', async () => {
  const store = setup(fn().mockRejectedValue(new Error('offline')));
  await store.toggle(1);
  expect(store.todos()[0].completed).toBe(false);
  expect(store.error()).toBe('Could not save the change.');
});

test('the rollback does not undo other todos that succeeded meanwhile', async () => {
  const first = deferred();
  const second = deferred();
  const save = fn((todo) => (todo.id === 1 ? first.promise : second.promise));
  const store = setup(save);
  const one = store.toggle(1);
  const two = store.toggle(2);
  second.resolve();
  await two;
  first.reject(new Error('fail'));
  await one;
  expect(store.todos().map((todo) => todo.completed)).toEqual([false, true]);
  expect(store.error()).toBe('Could not save the change.');
});

test('a new toggle clears the previous error and unknown ids do nothing', async () => {
  const save = fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue(undefined);
  const store = setup(save);
  await store.toggle(1);
  expect(store.error()).not.toBeNull();
  await store.toggle(99);
  expect(save).toHaveBeenCalledTimes(1);
  await store.toggle(2);
  expect(store.error()).toBeNull();
});
