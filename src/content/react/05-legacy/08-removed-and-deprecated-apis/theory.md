## Why this matters

Old tutorials, Stack Overflow answers and real codebases are full of APIs that **no longer exist**. Recognizing them, and knowing the modern replacement, is essential when you upgrade an app to React 19 or read code written in 2015–2020.

## createClass and mixins (removed in React 16)

Before ES2015 classes, components were created with `React.createClass`. It auto-bound methods and supported **mixins**, objects whose methods were merged into the component:

```jsx
const Timer = React.createClass({
  mixins: [SetIntervalMixin],
  getInitialState() {
    return { seconds: 0 };
  },
  render() {
    return <p>{this.state.seconds}</p>;
  },
});
```

`createClass` moved to the `create-react-class` package in React 15.5 and left React core in 16. Mixins were declared harmful: implicit dependencies, name clashes and snowballing complexity. **Replacement:** function components, and custom hooks for shared logic.

## PropTypes (ignored in React 19)

```jsx
Button.propTypes = { label: PropTypes.string.isRequired };
```

Runtime prop validation moved to the `prop-types` package in 15.5. React 19 **removed the checks entirely**: `propTypes` is silently ignored. **Replacement:** TypeScript, which validates props at compile time.

## defaultProps on function components (removed in React 19)

```jsx
function Avatar({ size }) { /* ... */ }
Avatar.defaultProps = { size: 64 };
```

**Replacement:** destructuring defaults, `function Avatar({ size = 64 })`. `static defaultProps` still works on **classes**.

## Legacy context (removed in React 19)

```jsx
class Provider extends Component {
  static childContextTypes = { theme: PropTypes.string };
  getChildContext() {
    return { theme: 'dark' };
  }
}
class Button extends Component {
  static contextTypes = { theme: PropTypes.string };
}
```

It relied on PropTypes and broke when an intermediate component's `shouldComponentUpdate` returned `false`. **Replacement:** `createContext` with `useContext`, or `static contextType` in classes.

## String refs (removed in React 19)

`<input ref="email" />` read through `this.refs.email`. **Replacement:** `useRef`, `createRef`, or callback refs.

## ReactDOM.render, hydrate and unmountComponentAtNode (removed in React 19)

```jsx
ReactDOM.render(<App />, document.getElementById('root'));
```

These "legacy root" APIs rendered synchronously and did not support concurrent features. They were deprecated in React 18.

```jsx
import { createRoot, hydrateRoot } from 'react-dom/client';

const root = createRoot(document.getElementById('root'));
root.render(<App />);
root.unmount();

hydrateRoot(document.getElementById('root'), <App />);
```

## findDOMNode (removed in React 19)

`ReactDOM.findDOMNode(this)` returned the first DOM node of a class instance. It broke abstraction (a parent could reach into a child's DOM), only returned the first child, and was slow. **Replacement:** attach a ref to the element you need, and pass it down as a prop if necessary.

## createFactory and module pattern factories (removed in React 19)

`React.createFactory('button')` returned a function that created elements, mainly for code written without JSX. **Replacement:** JSX or `createElement`. Function components that returned an object with a `render` method ("module pattern factories") are no longer supported either.

## UNSAFE_ lifecycles (deprecated, still running)

`UNSAFE_componentWillMount`, `UNSAFE_componentWillReceiveProps` and `UNSAFE_componentWillUpdate` still run in React 19 but warn in StrictMode. **Replacements:** `componentDidMount`, `getDerivedStateFromProps` or a `key`, and `getSnapshotBeforeUpdate`.

## Testing utilities

- `react-dom/test-utils` was removed; `act` now lives in `react` (`import { act } from 'react'`).
- `react-test-renderer` is deprecated and its shallow renderer removed. **Replacement:** React Testing Library.

## Other React 19 cleanups

- UMD builds are gone; use ESM CDNs such as esm.sh for script-tag demos.
- `element.ref` is deprecated: read `element.props.ref`.
- `forwardRef` still works but is unnecessary, since `ref` is a prop.
- `<Context.Provider>` still works, but `<Context value>` is the new shorthand.

## Upgrade strategy

1. Upgrade to **React 18.3** first: it is identical to 18.2 plus warnings for every API React 19 removes.
2. Fix warnings, run the official codemods (`npx codemod react/19/migration-recipe`).
3. Upgrade to React 19 and enable `<StrictMode>` to surface remaining legacy patterns.
