Implement three class components in `App.jsx`. Each one needs a different advanced lifecycle tool.

1. **`export class PriceTag extends Component`** receives `price` (number), `currency` (string) and `lastChecked` (any value).
   - Render a `<span>` with `{currency} {price.toFixed(2)}`, for example `USD 10.00`.
   - Implement `shouldComponentUpdate(nextProps)` so it re-renders **only** when `price` or `currency` change. A new `lastChecked` alone must not call `render`.
2. **`export class Row extends PureComponent`** renders `<li>{label}</li>`. Re-rendering the parent with the same `label` must not call `render` again.
3. **`export class EmailEditor extends Component`** receives `userId` and `defaultEmail`.
   - Render an `<input aria-label="Email">` controlled by `state.email` (initialized from `defaultEmail`). Typing updates the state.
   - Implement **`static getDerivedStateFromProps`** so that when `userId` changes, `email` resets to the new `defaultEmail`. Re-rendering with the same `userId` must keep what the user typed.

The default export `App` is already written.
