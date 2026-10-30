1. Classify every line of the container: data access and state transitions (controller), derived values (filtered list), and markup (view).
2. Move the controller part into `useUserDirectory`: state with `useState`, the request in a `useEffect` with a cleanup flag so a late response after unmount is ignored.
3. Compute the filtered list in the hook body from the loaded users and the query, so there is one source of truth and nothing to keep in sync.
4. Move the markup into `UserDirectory` and make every input a prop. Name the callback as an event (`onQueryChange`), not as the setter that happens to implement it.
5. Turn `App` into the composition: call the hook, pass its values to the view.
6. Test each piece at its cheapest level: the view with fake props and no network, the hook with `renderHook`, and the composed app once end to end.
