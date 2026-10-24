1. List consumers and what they read: the badge reads the user, the summary reads cart data, product cards only call `addItem`. That gives three groups with different change rates.
2. Create one context per group and nest their providers around `children`. Because the provider renders `children`, its own re-renders do not touch them; only consumers of changed values re-render.
3. Build each value with `useMemo`: user data depends on `user`, cart data on `items` (compute `count` and `total` there once), and actions depend on nothing because `dispatch` and `setUser` are stable.
4. Point each hook at its own context through a shared guard helper.
5. Verify with render counters (or the DevTools Profiler): add to cart, sign out and re-render the parent, checking that only the matching consumers render.
