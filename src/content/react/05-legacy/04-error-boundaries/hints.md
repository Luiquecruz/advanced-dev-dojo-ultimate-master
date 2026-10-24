`getDerivedStateFromError` is `static` and returns the new state: `static getDerivedStateFromError(error) { return { error }; }`. Then branch on `this.state.error` in `render`.
---
`componentDidCatch(error, info)` receives `info.componentStack`. Use optional call syntax so `onError` stays optional: `this.props.onError?.(error, info.componentStack)`.
---
Declare `reset = () => this.setState({ error: null })` as an arrow field and pass it: `this.props.fallbackRender({ error: this.state.error, reset: this.reset })`. In `App`, wrap `<BuggyCounter />` and pass a `fallbackRender` that returns the `role="alert"` markup.
