1. Normalize first: create the adapter, build the initial state from it and export its memoized selectors. Every other piece reads todos through these selectors.
2. Write the thunk around `fetch`, converting non-ok responses into thrown errors so they reach `rejected` with a clear message.
3. Add the `condition` guard so concurrent dispatches collapse into one request.
4. Map the thunk lifecycle to a finite `status` in `extraReducers`, using `setAll` on success.
5. Move the persistence side effect out of components: a listener on `todoToggled` reads the new state, sends the PATCH and, on failure, rolls back with a dedicated action plus a notification.
6. Install the listener middleware with `prepend` so it runs before the default middleware.
