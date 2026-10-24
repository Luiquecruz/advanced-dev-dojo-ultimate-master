## Redux in one paragraph

Redux keeps the whole client state in a single **store**. The only way to change it is to **dispatch an action** (a plain object like `{ type: 'todos/todoAdded', payload: 'Learn RTK' }`). A pure **reducer** function computes the next state from the current state and the action. Because every change is an explicit, serializable event, you get predictable updates, middleware, and time-travel debugging in the Redux DevTools.

## The legacy way: hand-written Redux

Before 2019, every feature needed action type constants, action creators, a `switch` reducer and careful immutable spreads:

```js
const TODO_ADDED = 'todos/todoAdded';
const TODO_TOGGLED = 'todos/todoToggled';

export const todoAdded = (title) => ({ type: TODO_ADDED, payload: { id: Date.now(), title, completed: false } });

export function todosReducer(state = { items: [] }, action) {
  switch (action.type) {
    case TODO_ADDED:
      return { ...state, items: [...state.items, action.payload] };
    case TODO_TOGGLED:
      return {
        ...state,
        items: state.items.map((todo) => (todo.id === action.payload ? { ...todo, completed: !todo.completed } : todo)),
      };
    default:
      return state;
  }
}

const store = createStore(combineReducers({ todos: todosReducer }), applyMiddleware(thunk));
```

Components were wrapped with `connect(mapStateToProps, mapDispatchToProps)(Component)`. It worked, but the boilerplate and accidental mutations were the top complaints. Today `createStore` is marked deprecated in the `redux` package and the Redux team officially recommends **Redux Toolkit (RTK)** for all Redux code.

## The modern way: Redux Toolkit

`createSlice` generates action creators and the reducer from one object. Reducers use **Immer**, so you write "mutating" code on a draft and Immer produces a new immutable state.

```js
import { createSlice, configureStore } from '@reduxjs/toolkit';

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    incremented(state) {
      state.value += 1;
    },
    addedBy(state, action) {
      state.value += action.payload;
    },
  },
  selectors: {
    selectValue: (state) => state.value,
  },
});

export const { incremented, addedBy } = counterSlice.actions;
export const { selectValue } = counterSlice.selectors;

export const store = configureStore({ reducer: { counter: counterSlice.reducer } });
```

- `counterSlice.actions.addedBy(5)` returns `{ type: 'counter/addedBy', payload: 5 }`.
- `slice.selectors` receive the **root** state and automatically look up the slice by its `name`, so `selectValue(store.getState())` works.
- `configureStore` combines reducers, adds the thunk middleware, enables the DevTools, and in development adds checks that throw on accidental mutations and warn about non-serializable values.

### Immer rule

Inside a case reducer, **either mutate the draft or return a new value, never both**. `return state.items.filter(...)` is wrong when the state is `{ items }`; write `state.items = state.items.filter(...)` instead.

### Keep reducers pure with `prepare`

Generating IDs or timestamps inside a reducer makes it impure. Use a `prepare` callback, which runs inside the action creator:

```js
todoAdded: {
  reducer(state, action) {
    state.items.push(action.payload);
  },
  prepare(title) {
    return { payload: { id: nanoid(), title, completed: false } };
  },
},
```

## Connecting React

```jsx
import { Provider, useDispatch, useSelector } from 'react-redux';

function Counter() {
  const value = useSelector(selectValue);
  const dispatch = useDispatch();
  return <button onClick={() => dispatch(incremented())}>{value}</button>;
}

<Provider store={store}>
  <Counter />
</Provider>;
```

`useSelector` re-renders the component only when the selected value changes by reference. Selectors returning new arrays (`state.items.filter(...)`) re-render on every action: memoize them with `createSelector`, which RTK re-exports from Reselect.

## A store factory

Exporting `makeStore()` instead of a singleton gives each test (and each server request in SSR frameworks) its own isolated store. This is the pattern recommended in the Next.js integration guide.

## Async logic

- `createAsyncThunk('users/fetch', async () => ...)` dispatches `pending`, `fulfilled` and `rejected` actions you handle in `extraReducers` with the builder callback (`builder.addCase(...)`). RTK 2 removed the old object syntax for `extraReducers`.
- **RTK Query** (`createApi`) is a full data-fetching and caching layer built into RTK, comparable to TanStack Query. Prefer it over hand-written thunks for server data.

## When Redux fits

Redux Toolkit suits large apps and teams that value strict conventions, explicit event logs, middleware (listeners, analytics, undo) and excellent devtools. For small amounts of global state, Zustand or Jotai are lighter.
