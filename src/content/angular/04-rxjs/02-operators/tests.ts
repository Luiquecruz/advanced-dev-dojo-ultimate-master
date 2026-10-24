const { Subject, of, timer, map } = require('rxjs');

function setup(search) {
  const queries = new Subject();
  const emitted = [];
  const subscription = mod.searchProducts(queries, search, 20).subscribe((value) => emitted.push(value));
  return { queries, emitted, subscription };
}

test('debounces a burst of keystrokes into a single search', async () => {
  const search = fn((query) => of([{ id: 1, name: query, price: 1 }]));
  const { queries, emitted, subscription } = setup(search);
  queries.next('ke');
  queries.next('key');
  queries.next('keyb');
  await sleep(60);
  expect(search).toHaveBeenCalledTimes(1);
  expect(search).toHaveBeenCalledWith('keyb');
  expect(emitted).toEqual([[{ id: 1, name: 'keyb', price: 1 }]]);
  subscription.unsubscribe();
});

test('trims queries and ignores a query equal to the previous one', async () => {
  const search = fn(() => of([]));
  const { queries, subscription } = setup(search);
  queries.next('mouse');
  await sleep(50);
  queries.next('  mouse ');
  await sleep(50);
  expect(search).toHaveBeenCalledTimes(1);
  expect(search).toHaveBeenCalledWith('mouse');
  subscription.unsubscribe();
});

test('queries shorter than 2 characters emit [] without searching', async () => {
  const search = fn(() => of([{ id: 9, name: 'x', price: 0 }]));
  const { queries, emitted, subscription } = setup(search);
  queries.next('m');
  await sleep(50);
  expect(search).not.toHaveBeenCalled();
  expect(emitted).toEqual([[]]);
  subscription.unsubscribe();
});

test('a newer query cancels the pending search (switchMap)', async () => {
  const search = (query) =>
    query === 'slow' ? timer(120).pipe(map(() => [{ id: 1, name: 'slow', price: 0 }])) : of([{ id: 2, name: 'fast', price: 0 }]);
  const { queries, emitted, subscription } = setup(search);
  queries.next('slow');
  await sleep(50);
  queries.next('fast');
  await sleep(200);
  expect(emitted).toEqual([[{ id: 2, name: 'fast', price: 0 }]]);
  subscription.unsubscribe();
});

test('typing "mo" lists Mouse and Monitor from the API', async () => {
  await render(mod.ProductSearch, { providers: mod.appConfig.providers });
  await user.type(screen.getByRole('searchbox', { name: 'Search products' }), 'mo');
  await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2), { timeout: 2500 });
  expect(screen.getByText('Mouse (45)')).toBeInTheDocument();
  expect(screen.getByText('Monitor (340)')).toBeInTheDocument();
});
