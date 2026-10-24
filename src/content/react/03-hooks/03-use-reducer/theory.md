## When `useState` gets crowded

A component that adds, edits, toggles, deletes and reorders items ends up with state updates scattered across many event handlers. Each handler knows **how** to change the state, so the logic is hard to read and test. `useReducer` moves every state transition into **one pure function**, the reducer, and handlers only describe **what happened**.

```jsx
import { useReducer } from 'react';

function counterReducer(count, action) {
  switch (action.type) {
    case 'incremented':
      return count + 1;
    case 'reset':
      return action.to;
    default:
      throw new Error(`Unknown action: ${action.type}`);
  }
}

function Counter() {
  const [count, dispatch] = useReducer(counterReducer, 0);
  return (
    <>
      <p>{count}</p>
      <button onClick={() => dispatch({ type: 'incremented' })}>+1</button>
      <button onClick={() => dispatch({ type: 'reset', to: 0 })}>Reset</button>
    </>
  );
}
```

- `useReducer(reducer, initialArg, init?)` returns `[state, dispatch]`.
- `dispatch(action)` queues the action. On the next render React calls `reducer(currentState, action)` and uses the return value as the new state.
- An **action** is any value; by convention an object with a `type` describing an event (`'added'`, `'toggled'`) plus the data needed.

## Reducers must be pure

A reducer receives the current state and returns the next one. It must not mutate its arguments, fetch data, set timers or read random values: React may call it more than once (StrictMode does so on purpose).

```jsx
case 'added':
  tasks.push(newTask);
  return tasks;
```

The code above mutates the existing array and returns the same reference, so React bails out and nothing re-renders. Return a **new** array or object instead:

```jsx
case 'added':
  return [...tasks, newTask];
case 'toggled':
  return tasks.map((task) => (task.id === action.id ? { ...task, done: !task.done } : task));
case 'deleted':
  return tasks.filter((task) => task.id !== action.id);
```

Unchanged items keep their identity, which lets `memo`-wrapped children skip rendering.

## Benefits

| | `useState` | `useReducer` |
| --- | --- | --- |
| Code size | small | more upfront |
| Readability with many transitions | logic spread across handlers | one place, named events |
| Testing | through the component | the reducer is a plain function |
| Debugging | log in every handler | log each action in one place |

`dispatch` has a **stable identity**, so it can be passed to children or listed as a dependency without causing re-renders. Combined with context (later lesson) it scales to app-level state.

## Lazy initialization

Pass an `init` function to compute the initial state once:

```jsx
const [state, dispatch] = useReducer(reducer, userId, (id) => loadDraft(id));
```

## Pitfalls

- `dispatch` does not update `state` in the running handler: like `setState`, the new value appears on the next render.
- Always handle the `default` case. Throwing on unknown types catches typos in action names.
- Keep reducers free of side effects. Fetch in the handler or an effect, then dispatch the result.

## Legacy and ecosystem

The pattern comes from **Redux** (2015), which itself borrowed from Elm. Class components had no built-in reducer, so apps used Redux for anything non-trivial. Redux Toolkit still uses reducers (with Immer allowing "mutating" syntax that produces immutable updates). The `use-immer` package offers `useImmerReducer` for the same style locally.
