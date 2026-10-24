1. Make failures loud first: a `null` default plus a throwing hook turns the silent "button does nothing" into an error that names the missing provider.
2. Follow the error to `App` and move `NotificationsProvider` above every component that uses the hook.
3. Rewrite the updates with updater functions, so batched calls in one event build on each other instead of on a stale snapshot.
4. Because the updaters no longer read `notifications`, wrap `notify` and `dismiss` in `useCallback` with empty dependencies.
5. Memoize the value object with `useMemo` on its three parts, so a parent re-render does not change it.
6. Replace `.Provider` with `<NotificationsContext value={value}>`, and optionally read it with `use`.
