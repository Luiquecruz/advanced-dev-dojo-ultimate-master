1. `PriceTag`: render `{this.props.currency} {this.props.price.toFixed(2)}` inside the `<span>`.
2. Add `shouldComponentUpdate(nextProps)` returning `true` only if `price` or `currency` differ from `this.props`. `lastChecked` is deliberately ignored.
3. `Row`: switch the base class to `PureComponent`, which shallowly compares props and state for you.
4. `EmailEditor`: add `static getDerivedStateFromProps(props, state)`.
5. Compare `props.userId` with `state.prevUserId`. When different, return the reset state including the new `prevUserId`; otherwise return `null`.
6. Notice how a `key={userId}` on `<EmailEditor>` would achieve the same reset without any lifecycle method: that is the modern recommendation.
