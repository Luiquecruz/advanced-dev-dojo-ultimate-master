1. Add `static defaultProps = { label: 'Count', step: 1 }` so React fills in missing props.
2. Initialize `state = { count: 0 }` as a class field (or in a constructor after `super(props)`).
3. Rewrite `increment`, `incrementTwice` and `reset` as arrow class fields so `this` stays bound when React calls them.
4. In `increment`, call `setState` with an updater `(prev) => ({ count: prev.count + this.props.step })`.
5. In `incrementTwice`, call the updater-based increment twice: each updater receives the result of the previous one.
6. Render `{this.props.label}: {this.state.count}` inside the `<p>`.
