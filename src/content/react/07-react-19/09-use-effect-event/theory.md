## Reactive values that should not re-run your effect

An effect re-runs when any value it reads changes. Usually that's what you want, but sometimes an effect reads a value only to **use** it inside a callback, not to decide **when** to synchronize.

```jsx
function ChatRoom({ roomId, theme }) {
  useEffect(() => {
    const connection = createConnection(roomId);
    connection.on('connected', () => {
      showNotification('Connected!', theme);
    });
    connection.connect();
    return () => connection.disconnect();
  }, [roomId, theme]);
}
```

The linter correctly requires `theme` in the dependency array. But now toggling dark mode **disconnects and reconnects the chat**. The connection depends on `roomId`; `theme` only affects how the notification looks.

### Old workarounds

1. **Omit `theme` from the dependencies** and silence the linter. The callback then reads a **stale** `theme` captured when the effect last ran: the classic stale closure bug.
2. **Mirror the value in a ref** that a layout effect keeps updated:

```jsx
const themeRef = useRef(theme);
useLayoutEffect(() => {
  themeRef.current = theme;
});
// inside the effect: showNotification('Connected!', themeRef.current)
```

It works, but it's boilerplate, easy to get wrong, and the intent is invisible.

## `useEffectEvent` (stable in React 19.2)

```jsx
import { useEffect, useEffectEvent } from 'react';

function ChatRoom({ roomId, theme }) {
  const onConnected = useEffectEvent(() => {
    showNotification('Connected!', theme);
  });

  useEffect(() => {
    const connection = createConnection(roomId);
    connection.on('connected', () => {
      onConnected();
    });
    connection.connect();
    return () => connection.disconnect();
  }, [roomId]);
}
```

An **Effect Event** is like an event handler fired from an effect:

- It always sees the **latest** props and state when called, like `onClick` handlers do.
- It is **not reactive**: it must not be listed in the dependency array, and changing `theme` never re-runs the effect.
- The `eslint-plugin-react-hooks` rules (v6+) understand it: no missing-dependency warning for values read inside an Effect Event.

Think of the split this way: the **effect** answers "what external system do I synchronize, and with which values?" (`roomId`); the **Effect Event** answers "what do I do when that system notifies me?" (read `theme`).

## Rules

- Only call Effect Events **from inside effects** (or from other Effect Events). Never call them during render, and never pass them to other components or Hooks.
- Declare them in the same component or custom Hook as the effect that uses them.
- Don't use them to hide real dependencies. If the effect should re-sync when a value changes, that value belongs in the dependency array.

## Typical use cases

| Effect reacts to | Effect Event reads |
| --- | --- |
| `roomId` (connection) | `theme`, `muted` for notifications |
| `url` (page view logging) | `cartItemCount` to include in the log |
| `interval` (timer) | `step` to add on each tick |
| a subscription | an `onChange` callback prop that the parent re-creates every render |
