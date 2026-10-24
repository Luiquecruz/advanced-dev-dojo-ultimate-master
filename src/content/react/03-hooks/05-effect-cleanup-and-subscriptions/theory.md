## Every setup needs a matching cleanup

An Effect connects your component to something outside React: a chat server, a WebSocket, a browser event, a timer, a third-party widget. Whatever the setup **starts**, the cleanup must **stop**. Return the cleanup function from the Effect:

```jsx
useEffect(() => {
  const connection = createConnection(roomId);
  connection.connect();
  return () => {
    connection.disconnect();
  };
}, [roomId]);
```

React runs the cleanup:

1. **Before re-running the Effect** with new dependencies, using the **old** values. Switching from `general` to `travel` produces `disconnect general` then `connect travel`.
2. **When the component unmounts**.

Think of an Effect as a description of **how to start and stop synchronizing** with the current props and state, not as a lifecycle event.

## Common pairs

| Setup | Cleanup |
| --- | --- |
| `connection.connect()` | `connection.disconnect()` |
| `window.addEventListener('resize', onResize)` | `window.removeEventListener('resize', onResize)` |
| `const id = setInterval(tick, 1000)` | `clearInterval(id)` |
| `const unsubscribe = store.subscribe(listener)` | `unsubscribe()` |
| `const controller = new AbortController()` + `fetch` | `controller.abort()` |
| `const map = new MapWidget(node)` | `map.destroy()` |

For listeners, `removeEventListener` needs the **same function reference** that was added. Declare the handler inside the Effect and use that variable in both calls:

```jsx
useEffect(() => {
  function handleOffline() {
    setIsOnline(false);
  }
  window.addEventListener('offline', handleOffline);
  return () => window.removeEventListener('offline', handleOffline);
}, []);
```

An inline arrow passed to `addEventListener` can never be removed.

## Dependencies: every reactive value

Props, state and anything derived from them during render are **reactive**. If the Effect reads them, list them. `[]` with `roomId` inside means "connect once and never react to room changes": the user switches rooms and keeps receiving messages from the first one. The `react-hooks/exhaustive-deps` lint rule catches this.

Functions and objects received as props are reactive too. If a parent creates them inline, they change every render and the Effect reconnects each time. Fix it at the source (define the function outside the component, `useCallback` in the parent) rather than lying in the dependency array. For "event-like" logic inside an Effect that should read the latest props without re-subscribing, React 19.2 adds `useEffectEvent` (covered in the React 19 module).

## StrictMode runs setup → cleanup → setup

In development, `<StrictMode>` mounts every component, **unmounts it and mounts it again**. Effects run setup, cleanup, setup. This is a stress test: if the cleanup mirrors the setup, users see no difference (one connection stays open). If it does not, you get two connections, duplicated listeners or doubled timers, which surface as bugs only in development.

Do not "fix" the double call with a `useRef` flag that skips the second setup; fix the missing cleanup. The production behavior with real remounts (Fast Refresh, `<Activity>` hiding, navigating back) needs the same guarantee.

## Effects that do not need cleanup

Logging analytics or sending a one-off request on a button click do not belong in Effects at all: put them in the event handler. Effects that only read the DOM (measure, focus) usually need no cleanup.

## Legacy vs modern

Class components split the pair across methods:

```jsx
componentDidMount() { this.connection = connect(this.props.roomId); }
componentDidUpdate(prevProps) {
  if (prevProps.roomId !== this.props.roomId) {
    this.connection.disconnect();
    this.connection = connect(this.props.roomId);
  }
}
componentWillUnmount() { this.connection.disconnect(); }
```

Forgetting `componentDidUpdate` was a classic bug. Effects keep setup and cleanup together and re-synchronize automatically when dependencies change.
