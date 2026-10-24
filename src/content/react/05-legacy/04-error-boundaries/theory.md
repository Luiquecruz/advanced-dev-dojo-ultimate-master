## One crash should not blank the whole app

Since React 16, an error thrown while rendering **unmounts the entire tree** if nothing catches it. A broken widget in the sidebar would leave users staring at a white page. **Error boundaries** catch those errors and show a fallback UI for just that part of the screen.

An error boundary is a **class component** that implements one or both of these methods:

```jsx
import { Component } from 'react';

class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    logToService(error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return <p role="alert">Something went wrong.</p>;
    }
    return this.props.children;
  }
}
```

- `static getDerivedStateFromError(error)` runs during render. It returns the state patch that switches to the fallback. Keep it pure.
- `componentDidCatch(error, info)` runs in the commit phase. Use it for side effects such as logging. `info.componentStack` shows which components were rendering.

There is still **no hook equivalent**, which is why this is the one place where new code keeps writing classes (or uses the `react-error-boundary` package, which wraps exactly this class).

## What a boundary catches

| Caught | Not caught |
| --- | --- |
| Errors thrown while rendering descendants | Errors in **event handlers** (use `try/catch`) |
| Errors in lifecycle methods and constructors below it | Async code: `setTimeout`, promises, `fetch` callbacks |
| Errors in effects of descendants | Server-side rendering errors |
| | Errors thrown by the boundary itself |

To route an async error into a boundary, store it in state and throw it during render:

```jsx
const [error, setError] = useState(null);
if (error) throw error;
// ...later: fetchData().catch(setError);
```

## Resetting

A boundary stays in the error state until its state changes. Offer a way out, like a **Try again** button that clears the error so the children render again:

```jsx
reset = () => this.setState({ error: null });

render() {
  if (this.state.error) {
    return this.props.fallbackRender({ error: this.state.error, reset: this.reset });
  }
  return this.props.children;
}
```

Another common pattern is giving the boundary a `key` (for example the current route) so navigating away mounts a fresh boundary.

## Where to place boundaries

Granularity is a product decision:

- One top-level boundary: a friendly "Something went wrong" page instead of a blank screen.
- One per independent widget, route or panel: the rest of the page keeps working.
- Not around every tiny component: too many fallbacks make the UI confusing.

## React 19 error reporting

React 19 no longer re-throws caught errors and logs each error **once**. `createRoot` accepts hooks for observability:

```jsx
createRoot(container, {
  onCaughtError: (error, info) => report('caught', error, info.componentStack),
  onUncaughtError: (error, info) => report('uncaught', error, info.componentStack),
  onRecoverableError: (error) => report('recovered', error),
});
```

## Legacy notes

- React 15 had an undocumented `unstable_handleError` method. It became `componentDidCatch` in React 16.
- Before React 16 a render error could leave the UI in a corrupted, half-updated state instead of unmounting it.
- Suspense and error boundaries work together: a rejected promise read with `use()` is thrown to the nearest error boundary.

## Pitfalls

- Expecting a boundary to catch an `onClick` error: it will not.
- Forgetting to render `this.props.children` in the happy path.
- Logging inside `getDerivedStateFromError`: it is called during render and must stay side-effect free.
