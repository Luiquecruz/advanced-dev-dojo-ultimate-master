Declare defaults and state as class fields: `static defaultProps = { label: 'Count', step: 1 };` and `state = { count: 0 };`.
---
A regular method passed as `onClick={this.increment}` loses `this`. Turn the handlers into arrow class fields: `increment = () => { ... };`.
---
The updater form reads the latest pending state: `this.setState((prev) => ({ count: prev.count + this.props.step }))`. Calling it twice in `incrementTwice` adds the step twice, while `this.setState({ count: this.state.count + step })` twice only adds it once.
