The orders dashboard (TypeScript) has three slices: `orders`, `filters` and `ui`. `App.tsx` is done. It works, but `OrderList` re-renders on every action, the selection survives archiving its order, and the store cannot be seeded for tests. Finish the Redux setup.

**`hooks.ts`**: export `useAppDispatch` and `useAppSelector` created with `useDispatch.withTypes<AppDispatch>()` and `useSelector.withTypes<RootState>()`.

**`selectors.ts`**: rewrite with `createSelector`:

- `selectVisibleOrders`: orders whose `status` matches the status filter (`'all'` matches everything) and whose `customer` includes the search text (case-insensitive). Returns **the same array** while orders and filters are unchanged.
- `selectOrderStats`: `{ count, revenue, pending }` (number of orders, sum of `total`, number of `pending` orders). Returns **the same object** while orders are unchanged.

**`uiSlice.ts`**: add `extraReducers` that respond to `orderArchived` (from `ordersSlice.ts`): when the archived id is the `selectedOrderId`, set it to `null`.

**`store.ts`**: `makeStore(preloadedState?)` passes `preloadedState` to `configureStore`, so `makeStore({ orders: { items: [...] } })` starts with those orders and default filters/ui.

Observable result: toggling the sidebar does not re-render `OrderList` (the tests wrap it in a `<Profiler>`), while changing the status filter does.
