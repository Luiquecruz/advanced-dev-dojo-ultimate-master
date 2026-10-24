`useSelector` compares the selector's result with `===` after every action. A `filter` call creates a new array each time, so the list re-renders even for `ui/sidebarToggled`. Memoize the derivation.
---
`createSelector([selectOrders, selectStatusFilter, selectSearch], (orders, status, search) => orders.filter(...))`: the result function only runs again when one of the inputs returns a new reference.
---
In `uiSlice.ts`: `import { orderArchived } from './ordersSlice';` then `extraReducers: (builder) => { builder.addCase(orderArchived, (state, action) => { if (state.selectedOrderId === action.payload) state.selectedOrderId = null; }); }`.
---
`export function makeStore(preloadedState?: Partial<RootState>) { return configureStore({ reducer: rootReducer, preloadedState }); }` and `export const useAppSelector = useSelector.withTypes<RootState>();`.
