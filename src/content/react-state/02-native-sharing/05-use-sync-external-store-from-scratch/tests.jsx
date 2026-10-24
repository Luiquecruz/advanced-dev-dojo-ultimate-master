const makeStore = () =>
  mod.createStore({
    todos: [
      { id: 1, title: 'A', done: false },
      { id: 2, title: 'B', done: true },
      { id: 3, title: 'C', done: false },
    ],
    lastSyncedAt: null,
  });

const toggle = (store, id) =>
  act(() => store.setState((state) => ({ todos: state.todos.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo)) })));

test('shallowEqual compares arrays and objects one level deep', () => {
  const { shallowEqual } = mod;
  const item = { id: 1 };
  expect(shallowEqual([item, 2], [item, 2])).toBe(true);
  expect(shallowEqual([item], [{ id: 1 }])).toBe(false);
  expect(shallowEqual([1, 2], [1, 2, 3])).toBe(false);
  expect(shallowEqual({ a: 1, b: item }, { b: item, a: 1 })).toBe(true);
  expect(shallowEqual({ a: 1 }, { b: 1 })).toBe(false);
  expect(shallowEqual(NaN, NaN)).toBe(true);
  expect(shallowEqual(null, {})).toBe(false);
});

test('a selector that returns a new array renders without looping when shallowEqual is passed', () => {
  const store = makeStore();
  function Open() {
    const open = mod.useStore(store, (state) => state.todos.filter((todo) => !todo.done), mod.shallowEqual);
    return <p>{open.map((todo) => todo.title).join(',')}</p>;
  }
  render(<Open />);
  expect(screen.getByText('A,C')).toBeInTheDocument();
});

test('an unrelated update does not re-render, a relevant one does', () => {
  const store = makeStore();
  const renders = fn();
  function Open() {
    const open = mod.useStore(store, (state) => state.todos.filter((todo) => !todo.done), mod.shallowEqual);
    renders();
    return <p>{open.map((todo) => todo.title).join(',')}</p>;
  }
  render(<Open />);
  act(() => store.setState({ lastSyncedAt: '10:00' }));
  toggle(store, 2);
  expect(screen.getByText('A,B,C')).toBeInTheDocument();
  expect(renders).toHaveBeenCalledTimes(2);
});

test('the returned selection keeps its identity while equal', () => {
  const store = makeStore();
  const seen = [];
  function Open() {
    seen.push(mod.useStore(store, (state) => state.todos.filter((todo) => !todo.done), mod.shallowEqual));
    return null;
  }
  const { rerender } = render(<Open />);
  rerender(<Open />);
  act(() => store.setState({ lastSyncedAt: '11:00' }));
  rerender(<Open />);
  expect(seen.length).toBeGreaterThanOrEqual(2);
  expect(seen.every((selection) => selection === seen[0])).toBe(true);
});

test('a selector that depends on props switches immediately when the prop changes', () => {
  const store = makeStore();
  function ByStatus({ done }) {
    const todos = mod.useStore(store, (state) => state.todos.filter((todo) => todo.done === done), mod.shallowEqual);
    return <p data-testid="list">{todos.map((todo) => todo.title).join(',')}</p>;
  }
  const { rerender } = render(<ByStatus done={false} />);
  expect(screen.getByTestId('list')).toHaveTextContent('A,C');
  rerender(<ByStatus done={true} />);
  expect(screen.getByTestId('list')).toHaveTextContent('B');
  toggle(store, 1);
  expect(screen.getByTestId('list')).toHaveTextContent('A,B');
});

test('server rendering reads the initial state through getServerSnapshot', () => {
  const { renderToString } = require('react-dom/server');
  const store = makeStore();
  act(() => store.setState({ lastSyncedAt: '12:00' }));
  function Status() {
    const lastSyncedAt = mod.useStore(store, (state) => state.lastSyncedAt);
    return <p>{lastSyncedAt ?? 'Never synced'}</p>;
  }
  expect(renderToString(<Status />)).toContain('Never synced');
});
