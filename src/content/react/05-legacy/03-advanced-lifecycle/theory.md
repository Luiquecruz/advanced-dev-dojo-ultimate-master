## Beyond mount, update and unmount

Classes have a few rarely used lifecycle methods that solve specific problems. You will meet them in mature codebases, so you need to read them, and know which modern tool replaces each one.

The full update order is:

1. `static getDerivedStateFromProps(props, state)`
2. `shouldComponentUpdate(nextProps, nextState)` (stops here if it returns `false`)
3. `render()`
4. `getSnapshotBeforeUpdate(prevProps, prevState)`
5. React updates the DOM
6. `componentDidUpdate(prevProps, prevState, snapshot)`

## shouldComponentUpdate: skipping renders

Return `false` to tell React that a re-render is unnecessary. React then skips `render` for this component **and its children**.

```jsx
class PriceTag extends Component {
  shouldComponentUpdate(nextProps) {
    return nextProps.price !== this.props.price;
  }
  render() {
    return <span>{this.props.price.toFixed(2)}</span>;
  }
}
```

It is a **performance hint**, not a guarantee: React may still re-render. And a wrong comparison causes stale UI bugs: if you forget a prop, the screen silently stops updating when it changes.

## PureComponent

`PureComponent` implements `shouldComponentUpdate` for you with a **shallow comparison** of every prop and state key (`Object.is` per key).

```jsx
class Row extends PureComponent {
  render() {
    return <li>{this.props.label}</li>;
  }
}
```

Shallow means new objects, arrays or inline functions (`onClick={() => ...}`) are always "different", so passing them defeats the optimization. Mutating an existing array and passing it again is the opposite bug: the reference is equal, so the row never updates.

> **Modern equivalent:** `memo(Component)` for function components, or let the React Compiler memoize automatically.

## static getDerivedStateFromProps

Runs before **every** render (mount and updates) and returns an object to merge into state, or `null`. It is `static`, so there is no `this`: it can only compute from `props` and `state`.

Its only legitimate use is **resetting state when a prop changes**. Store the previous prop in state and compare:

```jsx
class EmailEditor extends Component {
  state = { email: this.props.defaultEmail, prevUserId: this.props.userId };

  static getDerivedStateFromProps(props, state) {
    if (props.userId !== state.prevUserId) {
      return { email: props.defaultEmail, prevUserId: props.userId };
    }
    return null;
  }
}
```

It replaced the unsafe `componentWillReceiveProps`. In practice there is often a simpler answer: give the component a **`key`** (`<EmailEditor key={userId} />`) so React mounts a fresh instance when the id changes, or derive the value during render instead of copying it into state.

> **Modern equivalent:** a `key`, or "storing information from previous renders" with a `prevUserId` state and a check during render.

## getSnapshotBeforeUpdate

Runs after `render` but **before** the DOM changes. Whatever it returns is passed as the third argument of `componentDidUpdate`. The classic use is preserving scroll position in a chat log:

```jsx
getSnapshotBeforeUpdate(prevProps) {
  if (prevProps.messages.length < this.props.messages.length) {
    const list = this.listRef.current;
    return list.scrollHeight - list.scrollTop;
  }
  return null;
}

componentDidUpdate(prevProps, prevState, snapshot) {
  if (snapshot !== null) {
    const list = this.listRef.current;
    list.scrollTop = list.scrollHeight - snapshot;
  }
}
```

There is **no hook equivalent**. Function components usually read layout in `useLayoutEffect` or keep the previous measurement in a ref.

## The UNSAFE_ methods

`componentWillMount`, `componentWillReceiveProps` and `componentWillUpdate` ran during the render phase, so with concurrent rendering they could run several times or for renders that are thrown away. React 16.3 renamed them `UNSAFE_*`, and StrictMode warns about them. Replacements:

| Legacy method | Use instead |
| --- | --- |
| `componentWillMount` | constructor / `componentDidMount` |
| `componentWillReceiveProps` | `getDerivedStateFromProps`, a `key`, or `componentDidUpdate` |
| `componentWillUpdate` | `getSnapshotBeforeUpdate` + `componentDidUpdate` |

## Pitfalls

- `getDerivedStateFromProps` that copies a prop into state **unconditionally** throws away every local edit on each parent render.
- `shouldComponentUpdate` returning `false` also blocks updates of children that read changed props from the parent.
- Do not deep-compare in `shouldComponentUpdate`: it can cost more than the render it avoids.
