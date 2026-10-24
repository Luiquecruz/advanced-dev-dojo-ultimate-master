## Why migrate at all?

Classes still work in React 19, so a migration needs a reason. Good ones:

- You need a **hook** from a library (TanStack Query, React Router, React Hook Form): hooks cannot be called in classes.
- One concern is spread across `componentDidMount`, `componentDidUpdate` and `componentWillUnmount`, and bugs hide in the gaps.
- You want the React Compiler to memoize the component automatically: it only optimizes function components.

Bad reason: "classes are old". Migrate a component when you are already changing it, test it before and after, and keep error boundaries as classes.

## The translation table

| Class | Function component |
| --- | --- |
| `this.props.x` | destructured `{ x }` |
| `state = { a, b }` | one `useState` per independent value (or `useReducer`) |
| `this.setState({ a })` | `setA(...)` (replaces, does not merge) |
| `this.setState((prev) => ...)` | `setA((prev) => ...)` |
| `componentDidMount` + `componentDidUpdate` + `componentWillUnmount` for one concern | **one** `useEffect` with cleanup and dependencies |
| instance fields (`this.timerId`) | `useRef` |
| `createRef` | `useRef(null)` |
| `static contextType` / `this.context` | `useContext` |
| `shouldComponentUpdate` / `PureComponent` | `memo` |
| `getDerivedStateFromProps` | compute during render, a `key`, or a "previous value" state |
| arrow-field handlers | plain functions inside the component |
| `static defaultProps` | destructuring defaults |

## Think in concerns, not lifecycles

The most important mental shift: do **not** translate method by method (`componentDidMount` → `useEffect(..., [])`). Group the code by what it synchronizes with.

```jsx
class ChatRoom extends Component {
  componentDidMount() {
    this.unsubscribe = chat.subscribe(this.props.roomId, this.handleMessage);
    document.title = this.props.roomId;
  }

  componentDidUpdate(prevProps) {
    if (prevProps.roomId !== this.props.roomId) {
      this.unsubscribe();
      this.unsubscribe = chat.subscribe(this.props.roomId, this.handleMessage);
    }
    document.title = this.props.roomId;
  }

  componentWillUnmount() {
    this.unsubscribe();
  }
}
```

There are two concerns: the subscription and the document title. Each becomes one effect:

```jsx
function ChatRoom({ roomId }) {
  useEffect(() => {
    const unsubscribe = chat.subscribe(roomId, handleMessage);
    return unsubscribe;
  }, [roomId]);

  useEffect(() => {
    document.title = roomId;
  }, [roomId]);
}
```

The cleanup runs before re-subscribing and on unmount, so the `prevProps` comparison and the duplicated code disappear.

## Resetting state when a prop changes

Classes often reset state in `componentDidUpdate` or `getDerivedStateFromProps`. In function components, prefer, in order:

1. A **`key`** from the parent: `<ChatRoom key={roomId} roomId={roomId} />` mounts fresh state.
2. **Adjusting state during render** by remembering the previous prop:

```jsx
const [prevRoomId, setPrevRoomId] = useState(roomId);
if (roomId !== prevRoomId) {
  setPrevRoomId(roomId);
  setCount(0);
}
```

React re-renders immediately, before painting, so the user never sees the stale count. An effect that calls `setCount(0)` would work too, but it renders the wrong value once first.

## Updater functions and stale closures

Event subscriptions are a classic place for **stale closures**. Inside the effect, `count` is the value from the render that created the effect. Use the updater form so you never read an outdated value:

```jsx
const unsubscribe = chat.subscribe(roomId, () => setCount((current) => current + 1));
```

## A safe migration process

1. Write or run behavior tests (what users see, not `instance.state`). Tests that touch `wrapper.instance()` or `setState` directly must be rewritten first.
2. Convert props, state and handlers.
3. Regroup lifecycle code into effects by concern, each with complete dependencies (the `react-hooks/exhaustive-deps` lint rule helps).
4. Replace instance fields with refs only when the value must survive renders without causing them.
5. Run the tests again, and check the component under `<StrictMode>`: double-invoked effects reveal missing cleanups.

## Pitfalls

- Merging state like `setState` did: `setForm({ email })` **drops** other fields of an object state. Spread: `setForm((form) => ({ ...form, email }))`.
- An effect with a missing dependency silently keeps the first `roomId`.
- Translating `this.timer` to a `let timer` variable: it resets every render. Use `useRef`.
