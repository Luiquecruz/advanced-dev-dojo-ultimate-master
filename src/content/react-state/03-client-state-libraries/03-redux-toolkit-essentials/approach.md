1. Create the typed hooks first: types flow from `rootReducer` and `makeStore`, so nothing is written by hand.
2. Find the selectors that create references (`filter`, object literals) and rebuild them with `createSelector` on top of plain input selectors.
3. Check memoization the way `useSelector` does: same state → same result; unrelated action → inputs unchanged → same result.
4. Model archiving as one event: the `ui` slice listens to `orderArchived` with `extraReducers` instead of components dispatching a second "clear selection" action.
5. Thread `preloadedState` through `makeStore`, so tests and stories can start from any state.
