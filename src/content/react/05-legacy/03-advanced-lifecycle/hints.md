`shouldComponentUpdate(nextProps)` returns a boolean. Compare `nextProps.price` and `nextProps.currency` with `this.props`. For `Row`, simply change `extends Component` to `extends PureComponent`.
---
`getDerivedStateFromProps` must be `static`: it has no `this`. It receives `(props, state)` and returns either an object to merge into state or `null`.
---
The state already stores `prevUserId`. Inside `getDerivedStateFromProps`, when `props.userId !== state.prevUserId`, return `{ email: props.defaultEmail, prevUserId: props.userId }`; otherwise return `null` so typed text survives.
