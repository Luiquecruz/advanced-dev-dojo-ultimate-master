## Two tools that fit together

- A **reducer** centralizes how state changes.
- **Context** delivers values deep into the tree.

Together they give a feature its own small "store": any component below the provider can read the state or dispatch actions, without prop drilling and without a third-party library.

## Step 1: two contexts

Put the state and the `dispatch` function in **separate** contexts:

```jsx
const TasksContext = createContext(null);
const TasksDispatchContext = createContext(null);
```

Why two? Every consumer re-renders when its context value changes. `dispatch` never changes, but `tasks` changes on every action. A button that only dispatches (an "Add" form) should not re-render each time the list changes. Splitting the contexts makes that possible.

## Step 2: a provider component

Move `useReducer` into a component that renders both providers:

```jsx
export function TasksProvider({ children }) {
  const [tasks, dispatch] = useReducer(tasksReducer, initialTasks);
  return (
    <TasksContext value={tasks}>
      <TasksDispatchContext value={dispatch}>{children}</TasksDispatchContext>
    </TasksContext>
  );
}
```

`tasks` is the reducer's state (its reference only changes when the reducer returns a new array) and `dispatch` is stable, so no `useMemo` is needed for the values.

## Step 3: custom Hooks as the public API

Export Hooks instead of the raw contexts:

```jsx
export function useTasks() {
  const tasks = useContext(TasksContext);
  if (tasks === null) {
    throw new Error('useTasks must be used within a TasksProvider');
  }
  return tasks;
}

export function useTasksDispatch() {
  const dispatch = useContext(TasksDispatchContext);
  if (dispatch === null) {
    throw new Error('useTasksDispatch must be used within a TasksProvider');
  }
  return dispatch;
}
```

The `null` default plus the throw turns a silent bug (a component rendered outside the provider reading `undefined`) into a clear error message. Consumers stay tiny:

```jsx
function AddTask() {
  const dispatch = useTasksDispatch();
  return <button onClick={() => dispatch({ type: 'added', title: 'New' })}>Add</button>;
}

function TaskList() {
  const tasks = useTasks();
  return <ul>{tasks.map((task) => <li key={task.id}>{task.title}</li>)}</ul>;
}
```

The components no longer know where state lives. You can later swap the implementation (persist to the server, move to Zustand) without touching them.

## Structure

Keep everything for the feature in one module (`TasksContext.jsx`): reducer, contexts, provider and Hooks. Export only the provider and the Hooks.

## Limits of this pattern

- Every `useTasks()` consumer re-renders on **any** task change. There is no selector to subscribe to a slice. For large, frequently changing global state, libraries with selectors (Zustand, Redux Toolkit, Jotai) scale better.
- Place the provider as low as possible: only the subtree that needs the state.
- Async work (fetching, saving) happens in event handlers or Effects, which then `dispatch` the result. Reducers stay pure.

## Legacy vs modern

This is the "Redux without Redux" pattern. Before Hooks, the same structure required Redux's `<Provider>` and `connect()` higher-order component, or a hand-rolled class provider with `this.setState`. React 19 shortened the providers from `<TasksContext.Provider value>` to `<TasksContext value>`.
