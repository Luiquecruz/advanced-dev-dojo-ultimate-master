import { useSyncExternalStore } from 'react';

export function createStore(initialState) {
  let state = initialState;
  const listeners = new Set();

  return {
    getState: () => state,
    getInitialState: () => initialState,
    setState(partial) {
      const patch = typeof partial === 'function' ? partial(state) : partial;
      if (Object.keys(patch).every((key) => Object.is(patch[key], state[key]))) return;
      state = { ...state, ...patch };
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function shallowEqual(a, b) {
  // TODO: true for Object.is-equal values, or for two arrays/objects with the same keys and Object.is-equal values
  return Object.is(a, b);
}

export function useStore(store, selector, isEqual = Object.is) {
  // TODO: cache the last selection; reuse it when the snapshot and selector are unchanged or when isEqual(previous, next)
  // TODO: pass a getServerSnapshot that selects from store.getInitialState()
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()));
}

export const todoStore = createStore({
  todos: [
    { id: 1, title: 'Review pull request', done: false },
    { id: 2, title: 'Write release notes', done: true },
    { id: 3, title: 'Update dependencies', done: false },
  ],
  lastSyncedAt: null,
});

export const toggleTodo = (id) =>
  todoStore.setState((state) => ({
    todos: state.todos.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo)),
  }));

export const markSynced = () => todoStore.setState({ lastSyncedAt: new Date().toLocaleTimeString() });

function OpenTodos() {
  const open = useStore(todoStore, (state) => state.todos.filter((todo) => !todo.done), shallowEqual);
  return (
    <ul aria-label="Open todos">
      {open.map((todo) => (
        <li key={todo.id}>
          {todo.title}
          <button onClick={() => toggleTodo(todo.id)}>Done</button>
        </li>
      ))}
    </ul>
  );
}

function SyncStatus() {
  const lastSyncedAt = useStore(todoStore, (state) => state.lastSyncedAt);
  return (
    <p>
      {lastSyncedAt ? `Synced at ${lastSyncedAt}` : 'Never synced'} <button onClick={markSynced}>Sync now</button>
    </p>
  );
}

export default function App() {
  return (
    <main>
      <SyncStatus />
      <OpenTodos />
    </main>
  );
}
