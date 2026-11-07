const setup = (loader) => {
  TestBed.configureTestingModule({ providers: [{ provide: mod.LOADER, useValue: loader }] });
  return TestBed.inject(mod.NamesStore);
};

test('starts idle and exposes a read-only state', () => {
  const store = setup(fn());
  expect(store.state()).toEqual({ status: 'idle' });
  expect(store.names()).toEqual([]);
  expect(store.state.set).toBeUndefined();
});

test('load() goes through loading and ends in success with the data', async () => {
  let release;
  const loader = fn(() => new Promise((resolve) => (release = resolve)));
  const store = setup(loader);
  const pending = store.load();
  expect(store.state()).toEqual({ status: 'loading' });
  expect(store.isLoading()).toBe(true);
  release(['Ada', 'Alan']);
  await pending;
  expect(store.state()).toEqual({ status: 'success', data: ['Ada', 'Alan'] });
  expect(store.names()).toEqual(['Ada', 'Alan']);
  expect(store.isLoading()).toBe(false);
});

test('an empty array is the empty state, not an error', async () => {
  const store = setup(fn().mockResolvedValue([]));
  await store.load();
  expect(store.state()).toEqual({ status: 'empty' });
  expect(store.names()).toEqual([]);
});

test('failures become an error state with the message', async () => {
  const failing = setup(fn().mockRejectedValue(new Error('Server down')));
  await failing.load();
  expect(failing.state()).toEqual({ status: 'error', message: 'Server down' });
});

test('a non-Error rejection uses the generic message', async () => {
  const store = setup(fn().mockRejectedValue('boom'));
  await store.load();
  expect(store.state()).toEqual({ status: 'error', message: 'Unknown error' });
});

test('load() while loading does not call the loader again', async () => {
  let release;
  const loader = fn(() => new Promise((resolve) => (release = resolve)));
  const store = setup(loader);
  const first = store.load();
  await store.load();
  expect(loader).toHaveBeenCalledTimes(1);
  release(['Ada']);
  await first;
});
