Build a reusable error boundary and use it to isolate a buggy widget.

1. **`export class ErrorBoundary extends Component`**
   - Renders `children` while there is no error.
   - Implements **`static getDerivedStateFromError(error)`** to store the error in state.
   - Implements **`componentDidCatch(error, info)`** and calls the optional `onError` prop with `(error, info.componentStack)`.
   - When an error was caught, renders `this.props.fallbackRender({ error, reset })`, where `reset` clears the error so the children render again.
2. **`export default function App()`** renders:
   - an `<h1>` with `Dashboard`,
   - the provided `BuggyCounter` wrapped in your `ErrorBoundary`, with a `fallbackRender` that returns a `<div role="alert">` containing a `<p>` with `Something went wrong: {error.message}` and a `<button>` **`Try again`** that calls `reset`.

`BuggyCounter` throws `Counter crashed` while rendering when its count reaches `3`. The `<h1>` must stay visible when it crashes.
