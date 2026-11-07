const { Observable, Subject, throwError, of } = require('rxjs');

const setup = (search, save = () => of('saved')) => {
  TestBed.configureTestingModule({
    providers: [
      { provide: mod.SEARCH, useValue: search },
      { provide: mod.SAVE, useValue: save },
    ],
  });
  return TestBed.inject(mod.SearchStore);
};
const wait = () => sleep(mod.DEBOUNCE_MS * 3);

test('results follow the latest query after the debounce', async () => {
  const search = fn((query) => of([`${query}-result`]));
  const store = setup(search);
  expect(store.results()).toEqual([]);
  store.find('a');
  store.find('ab');
  store.find('abc');
  await wait();
  expect(search).toHaveBeenCalledTimes(1);
  expect(store.results()).toEqual(['abc-result']);
});

test('an identical query is not searched twice', async () => {
  const search = fn((query) => of([query]));
  const store = setup(search);
  store.find('x');
  await wait();
  store.find('x');
  await wait();
  expect(search).toHaveBeenCalledTimes(1);
});

test('a slow old response is cancelled and cannot replace a newer one', async () => {
  const pending = {};
  const cancelled = [];
  const search = (query) =>
    new Observable((subscriber) => {
      pending[query] = subscriber;
      return () => cancelled.push(query);
    });
  const store = setup(search);
  store.find('a');
  await wait();
  store.find('ab');
  await wait();
  pending.ab.next(['ab-result']);
  pending.ab.complete();
  expect(store.results()).toEqual(['ab-result']);
  expect(cancelled).toContain('a');
  pending.a.next(['a-result']);
  expect(store.results()).toEqual(['ab-result']);
});

test('a failing search clears results and the pipeline keeps working', async () => {
  const search = (query) => (query === 'bad' ? throwError(() => new Error('boom')) : of([query]));
  const store = setup(search);
  store.find('ok');
  await wait();
  expect(store.results()).toEqual(['ok']);
  store.find('bad');
  await wait();
  expect(store.results()).toEqual([]);
  store.find('again');
  await wait();
  expect(store.results()).toEqual(['again']);
});

test('submit() ignores new submits while a save is in progress', async () => {
  const gate = new Subject();
  const save = fn((name) => new Observable((subscriber) => {
    const subscription = gate.subscribe(() => {
      subscriber.next(name);
      subscriber.complete();
    });
    return () => subscription.unsubscribe();
  }));
  const store = setup(() => of([]), save);
  store.submit('first');
  store.submit('second');
  expect(save).toHaveBeenCalledTimes(1);
  gate.next();
  expect(store.saved()).toEqual(['first']);
  store.submit('third');
  gate.next();
  expect(store.saved()).toEqual(['first', 'third']);
});

test('the pipelines use switchMap, exhaustMap and takeUntilDestroyed', () => {
  expect(sources['search.ts']).toMatch(/switchMap\(/);
  expect(sources['search.ts']).toMatch(/exhaustMap\(/);
  expect(sources['search.ts']).toMatch(/takeUntilDestroyed\(/);
});
