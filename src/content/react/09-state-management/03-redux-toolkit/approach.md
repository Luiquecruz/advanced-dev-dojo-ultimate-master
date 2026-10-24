1. Turn `todoAdded` into the `{ reducer, prepare }` form so the random id is generated in the action creator, keeping the reducer pure and deterministic.
2. Implement `todoToggled` by finding the todo on the draft and flipping `completed`; Immer turns that mutation into a new state object.
3. Implement `completedCleared` by reassigning `state.items` (do not return a filtered array: that would replace the whole slice state with an array).
4. Complete `selectRemainingCount`; RTK wraps slice selectors so callers pass the root state.
5. Return `configureStore` from `makeStore` with the reducer map `{ todos: todosSlice.reducer }`; the key must match the slice `name` for slice selectors to work.
6. In `TodoApp`, replace the placeholders with `useSelector` calls and dispatch the action creators from the event handlers.
7. Provide the store once at the top with `<Provider store={store}>`.
