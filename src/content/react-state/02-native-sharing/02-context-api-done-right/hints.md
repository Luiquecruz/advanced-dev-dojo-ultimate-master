Start with the guard: `createContext(null)` and `if (context === null) throw new Error('useNotifications must be used within a NotificationsProvider')`. Run the app: the error now points at the real bug in `App`.
---
`Header` is rendered outside `<NotificationsProvider>`. Move the provider up so it wraps both the header and `<main>`.
---
Three notifies in one click lose updates because each uses the same `notifications` snapshot. Use updater functions: `setNotifications((previous) => [...previous, item])`. With updaters, `useCallback(..., [])` is safe.
---
`const value = useMemo(() => ({ notifications, notify, dismiss }), [notifications, notify, dismiss]);` then `return <NotificationsContext value={value}>{children}</NotificationsContext>;`.
