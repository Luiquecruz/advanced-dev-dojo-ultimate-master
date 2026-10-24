## What Redux adds on top of a store

Every store holds state and notifies subscribers. Redux adds a **discipline**: state changes only by dispatching **actions** (serializable events), and pure **reducers** compute the next state. That gives you a complete, replayable log of what happened, middleware that can observe every event, and time-travel debugging. Redux Toolkit (RTK) is the official way to write it: `createSlice`, `configureStore`, Immer-powered reducers and Reselect built in.

## Shape of a store: slices by domain

```ts
const rootReducer = combineReducers({
  orders: ordersSlice.reducer,
  filters: filtersSlice.reducer,
  ui: uiSlice.reducer,
});

export type RootState = ReturnType<typeof rootReducer>;

export function makeStore(preloadedState?: Partial<RootState>) {
  return configureStore({ reducer: rootReducer, preloadedState });
}

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore['dispatch'];
```

- **Infer types, never write them by hand**: `RootState` comes from the reducer, `AppDispatch` from the store (it knows about thunks and middleware).
- A **`makeStore` factory** with `preloadedState` gives each test, each SSR request and each storybook story its own store, seeded with exactly the data it needs.

## Typed hooks

Instead of annotating every `useSelector((state: RootState) => ...)`, create pre-typed hooks once:

```ts
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
```

Components import only these. `withTypes` (react-redux 9+) replaces the older `TypedUseSelectorHook` pattern.

## Actions are events: many reducers can respond

A slice's `reducers` handle its own actions. `extraReducers` let a slice respond to actions **defined elsewhere**:

```ts
extraReducers: (builder) => {
  builder.addCase(orderArchived, (state, action) => {
    if (state.selectedOrderId === action.payload) state.selectedOrderId = null;
  });
},
```

The orders slice does not know the UI slice exists. One event (`orderArchived`) updates both. This is the main design difference from a setter-based store: you dispatch **what happened**, and every interested slice decides what it means. Avoid dispatching several "setter" actions in a row to keep slices in sync.

## Selectors and memoization

`useSelector` runs the selector after **every** dispatched action and re-renders when the result changes by reference (`===`). Selectors that derive new arrays or objects therefore re-render on every action, and react-redux warns in development that the selector "returned a different result when called with the same parameters".

`createSelector` memoizes: it only recomputes when its **input selectors** return new references.

```ts
export const selectVisibleOrders = createSelector(
  [selectOrders, selectStatusFilter, selectSearch],
  (orders, status, search) =>
    orders.filter((order) => (status === 'all' || order.status === status) && order.customer.includes(search)),
);
```

Rules of thumb:

- Input selectors are plain lookups (`state => state.orders.items`). Never derive inside them.
- Only memoize selectors that **create** references; `state => state.ui.sidebarOpen` needs nothing.
- Selectors with arguments (`selectOrdersByCustomer(state, id)`) share one cache across components with different arguments; RTK 2's default `weakMapMemoize` handles that well, but measure before building per-component selector factories.
- Store the minimal state; derive totals, filtered lists and stats with selectors.

## Do not rebuild server caching

Orders in this lesson live in the store for clarity. In a real app, server data belongs to **RTK Query** (or TanStack Query), covered in the server state module. Redux slices are for client state: filters, selection, UI flows, drafts that span screens.

## When to use it / when not to

Choose Redux Toolkit when the app has substantial, interconnected client state; when many features react to the same events; when you want strict conventions across a large team, middleware (analytics, undo, sync) and first-class devtools; or when you already use RTK Query. Prefer Zustand or Jotai for small to medium client state with less ceremony, local state and the URL for view state, and a query cache for server data. Do not put form drafts or every UI toggle in Redux by default.
