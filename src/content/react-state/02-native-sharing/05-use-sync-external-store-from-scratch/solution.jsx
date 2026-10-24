import { useRef, useSyncExternalStore } from 'react';

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
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => Object.hasOwn(b, key) && Object.is(a[key], b[key]));
}

export function useStore(store, selector, isEqual = Object.is) {
  const cache = useRef(null);

  const select = (snapshot) => {
    const current = cache.current;
    if (current && current.snapshot === snapshot && current.selector === selector) {
      return current.selection;
    }
    const next = selector(snapshot);
    const selection = current && isEqual(current.selection, next) ? current.selection : next;
    cache.current = { snapshot, selector, selection };
    return selection;
  };

  return useSyncExternalStore(
    store.subscribe,
    () => select(store.getState()),
    () => select(store.getInitialState()),
  );
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
