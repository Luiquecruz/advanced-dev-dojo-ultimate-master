const items = [
  { id: 1, title: 'One', completed: false },
  { id: 2, title: 'Two', completed: true },
  { id: 3, title: 'Three', completed: false },
];
const setup = (list) => {
  TestBed.configureTestingModule({ providers: [{ provide: mod.TODO_API, useValue: { list } }] });
  return TestBed.inject(mod.TodosFacade);
};

test('vm starts idle and counts the remaining todos', async () => {
  const facade = setup(fn().mockResolvedValue(items));
  expect(facade.vm()).toEqual({ status: 'idle', items: [], remaining: 0 });
  await facade.load();
  expect(facade.vm().remaining).toBe(2);
  expect(facade.vm().items).toEqual(items);
});

test('load() goes through loading and ends ready', async () => {
  let release;
  const facade = setup(fn(() => new Promise((resolve) => (release = resolve))));
  const pending = facade.load();
  expect(facade.vm().status).toBe('loading');
  release(items);
  await pending;
  expect(facade.vm().status).toBe('ready');
});

test('a failing load sets error and keeps the previous items', async () => {
  const list = fn().mockResolvedValueOnce(items).mockRejectedValueOnce(new Error('offline'));
  const facade = setup(list);
  await facade.load();
  await facade.load();
  expect(facade.vm().status).toBe('error');
  expect(facade.vm().items).toEqual(items);
});

test('toggle() delegates to the store and updates the view model', async () => {
  const facade = setup(fn().mockResolvedValue(items));
  await facade.load();
  facade.toggle(1);
  expect(facade.vm().remaining).toBe(1);
  facade.toggle(2);
  expect(facade.vm().remaining).toBe(2);
});

test('the store and the API are private members of the facade', () => {
  expect(sources['facade.ts']).toMatch(/(private\s+(readonly\s+)?|#)store\b/);
  expect(sources['facade.ts']).toMatch(/(private\s+(readonly\s+)?|#)api\b/);
});
