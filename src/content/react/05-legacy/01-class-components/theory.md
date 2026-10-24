## Components before Hooks

Until React 16.8 (2019), a component that needed **state** or **lifecycle** logic had to be a JavaScript class. Function components existed, but they were "stateless". Hooks changed that, and today react.dev recommends function components for all new code. Yet class components are **not removed**: React 19 still runs them, millions of lines of production code use them, and one feature (error boundaries) still requires a class.

```jsx
import { Component } from 'react';

class Greeting extends Component {
  render() {
    return <h1>Hello, {this.props.name}</h1>;
  }
}
```

- A class component extends `React.Component` (or `PureComponent`).
- `render()` is the only required method. It must be **pure**: read `this.props` and `this.state`, return JSX.
- Props live on `this.props`, never in the `render` parameters.

## State and setState

State is a single object on `this.state`. You change it only through `this.setState`, never by assignment (except in the constructor or a class field).

```jsx
class Counter extends Component {
  state = { count: 0, label: 'Clicks' };

  increment = () => {
    this.setState({ count: this.state.count + 1 });
  };

  render() {
    return <button onClick={this.increment}>{this.state.label}: {this.state.count}</button>;
  }
}
```

Two rules to remember:

1. **`setState` merges shallowly.** `setState({ count: 1 })` keeps `label`. This differs from `useState`, where the setter *replaces* the value.
2. **`setState` is asynchronous and batched.** `this.state` is not updated right after the call. When the next state depends on the previous one, pass an **updater function**:

```jsx
addTwo = () => {
  this.setState((prev) => ({ count: prev.count + 1 }));
  this.setState((prev) => ({ count: prev.count + 1 }));
};
```

With the object form, both calls would read the same stale `this.state.count` and the counter would only move by one.

## The `this` binding problem

Class methods are not bound automatically. Passing `onClick={this.increment}` with a regular method loses `this`, and `this.setState` throws `Cannot read properties of undefined`.

```jsx
class Legacy extends Component {
  constructor(props) {
    super(props);
    this.state = { count: 0 };
    this.increment = this.increment.bind(this);
  }

  increment() {
    this.setState((prev) => ({ count: prev.count + 1 }));
  }
}
```

The older fix binds in the constructor (always call `super(props)` first). The modern class style uses **class field arrow functions** (`increment = () => { ... }`), which capture `this` lexically. Avoid `onClick={() => this.increment()}` in hot lists: it creates a new function per render.

## Default props

Classes still support `static defaultProps`. React fills in a default when the prop is `undefined`:

```jsx
class Button extends Component {
  static defaultProps = { variant: 'primary' };
}
```

> React 19 **removed** `defaultProps` for function components (use destructuring defaults there), but it still works on classes.

## Class vs function, side by side

| Concern | Class | Function |
| --- | --- | --- |
| Props | `this.props.name` | `({ name })` |
| State | `this.state` + `this.setState` (merges) | `useState` (replaces) |
| Side effects | lifecycle methods | `useEffect` |
| Instance values | `this.timer = ...` | `useRef` |
| Defaults | `static defaultProps` | destructuring defaults |

## Pitfalls

- Mutating `this.state.items.push(x)` and then calling `setState` does not reliably re-render. Create new arrays and objects, exactly as with hooks.
- Reading `this.state` right after `setState` gives the **old** value. Use the updater, or the second `setState(updater, callback)` argument.
- Forgetting `super(props)` in a constructor makes `this.props` undefined inside it.
- Hooks **cannot** be called inside classes. To reuse hook logic in a class, wrap it in a small function component or a HOC.

## When to write one today

Write classes only for error boundaries or when you maintain an existing class codebase. Everywhere else, prefer function components and hooks. Being fluent in both lets you read, fix and migrate legacy code confidently.
