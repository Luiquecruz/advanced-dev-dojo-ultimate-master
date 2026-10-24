## Three phases of a class component

Every class component instance goes through three phases. React calls specific methods in each one:

| Phase | Methods, in order |
| --- | --- |
| **Mounting** (first time on screen) | `constructor` → `render` → React updates the DOM → `componentDidMount` |
| **Updating** (new props, `setState`, `forceUpdate`) | `render` → React updates the DOM → `componentDidUpdate(prevProps, prevState)` |
| **Unmounting** (removed from the tree) | `componentWillUnmount` |

`render` belongs to the **render phase**: it must be pure and may run several times before a commit. `componentDidMount`, `componentDidUpdate` and `componentWillUnmount` run in the **commit phase**, after the DOM is up to date. That is where side effects go: network requests, subscriptions, timers, manual DOM work.

## componentDidMount

Runs once, right after the first commit. Start subscriptions and requests here, never in the constructor or `render`.

```jsx
class Clock extends Component {
  state = { now: new Date() };

  componentDidMount() {
    this.timerId = setInterval(() => this.setState({ now: new Date() }), 1000);
  }

  componentWillUnmount() {
    clearInterval(this.timerId);
  }

  render() {
    return <time>{this.state.now.toLocaleTimeString()}</time>;
  }
}
```

Instance fields such as `this.timerId` play the role that `useRef` plays in function components: values that survive renders but do not trigger them.

## componentDidUpdate

Runs after every update, **not** after the first mount. It receives the previous props and state so you can react to a specific change:

```jsx
componentDidUpdate(prevProps) {
  if (prevProps.roomId !== this.props.roomId) {
    this.disconnect();
    this.connect(this.props.roomId);
  }
}
```

Always compare before acting. Calling `setState` unconditionally inside `componentDidUpdate` triggers another update, which calls `componentDidUpdate` again: an infinite loop.

## componentWillUnmount

Runs right before the instance is destroyed. Undo everything `componentDidMount` started: clear timers, remove listeners, abort requests, close sockets. Forgetting it leaks memory and produces "state update on an unmounted component" bugs.

## The classic pitfall: forgetting updates

A very common legacy bug is fetching in `componentDidMount` only:

```jsx
componentDidMount() {
  fetch(`/api/users/${this.props.userId}`).then(/* ... */);
}
```

When the parent passes a new `userId`, the component keeps showing the old user, because `componentDidMount` never runs again. The fix is to duplicate the logic in `componentDidUpdate` (guarded by a comparison) and to clean up in `componentWillUnmount`. Note how a single concern, "load the user for this id", gets spread over **three** methods.

## Legacy vs modern: one effect for one concern

`useEffect` groups setup and cleanup by concern instead of by lifecycle moment, and the dependency array replaces the manual `prevProps` comparison:

```jsx
useEffect(() => {
  const controller = new AbortController();
  fetch(`/api/users/${userId}`, { signal: controller.signal })
    .then((response) => response.json())
    .then(setUser)
    .catch(() => {});
  return () => controller.abort();
}, [userId]);
```

| Class | Hooks |
| --- | --- |
| `componentDidMount` | `useEffect(fn, [])` |
| `componentDidUpdate` + `prevProps` check | `useEffect(fn, [dep])` |
| `componentWillUnmount` | the cleanup returned by the effect |
| all three together | one `useEffect` with setup, cleanup and dependencies |

## Other lifecycle notes

- In development `<StrictMode>` mounts, unmounts and remounts classes too, to prove your `componentWillUnmount` really undoes `componentDidMount`.
- `componentWillMount`, `componentWillReceiveProps` and `componentWillUpdate` are legacy. They were renamed `UNSAFE_*` in React 16.3 because they run during the render phase and break with concurrent rendering. The next lesson shows their replacements.
- `forceUpdate()` skips `shouldComponentUpdate` and re-renders. It is almost always a sign that data should live in state.
