`componentDidMount` runs only once. Add `componentDidUpdate(prevProps)` and call `this.loadUser()` when `prevProps.userId !== this.props.userId`. Without the comparison you create an infinite loop.
---
Store an `AbortController` on the instance (`this.controller`) and pass `{ signal: this.controller.signal }` to `fetch`. Abort the previous one at the start of `loadUser`.
---
`componentWillUnmount() { this.controller?.abort(); }`. Aborting rejects the `fetch` promise with an `AbortError`: add `.catch((error) => { if (error.name !== 'AbortError') throw error; })` so it is not reported as a failure.
