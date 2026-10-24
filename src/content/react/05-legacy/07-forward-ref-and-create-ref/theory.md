## Refs in class components: createRef

A ref is a box with a mutable `current` property. React fills it with a DOM node (or class instance) after commit and resets it to `null` on unmount. Function components create refs with `useRef`; class components use **`createRef`** and store the box on the instance:

```jsx
import { Component, createRef } from 'react';

class SearchForm extends Component {
  inputRef = createRef();

  componentDidMount() {
    this.inputRef.current.focus();
  }

  render() {
    return <input ref={this.inputRef} />;
  }
}
```

`createRef()` returns a **new object every time it is called**. That is fine in a class field (it runs once per instance) but a bug inside a function component, where the body runs on every render: use `useRef` there.

A ref on a **class component** element gives you its **instance**, so the parent can call its methods: `this.formRef.current.reset()`. A ref on a **function component** gives nothing unless that component passes it on.

## The history of refs

| Era | API |
| --- | --- |
| React ≤ 15 | String refs: `<input ref="name" />` read as `this.refs.name` (**removed in React 19**) |
| React 16.0 | Callback refs: `ref={(node) => (this.input = node)}` |
| React 16.3 | `createRef()` objects and `forwardRef()` |
| React 16.8 | `useRef` for function components |
| React 19 | `ref` is a regular prop for function components; ref callbacks may return a cleanup |

String refs were removed because React had to track which component "owned" each string, they could not be composed, and they did not work with static analysis.

## forwardRef

Before React 19, `ref` was **stripped from props**, like `key`. A function component that wanted to expose its inner `<input>` had to opt in with `forwardRef`, which passes the ref as a **second argument**:

```jsx
import { forwardRef } from 'react';

const TextField = forwardRef(function TextField({ label }, ref) {
  return (
    <label>
      {label}
      <input ref={ref} />
    </label>
  );
});

<TextField ref={inputRef} label="Name" />;
```

Use a named function inside `forwardRef` so DevTools shows `ForwardRef(TextField)` instead of `ForwardRef(Anonymous)`.

## Modern: ref as a prop (React 19)

React 19 passes `ref` to function components like any other prop. No wrapper needed:

```jsx
function TextField({ label, ref }) {
  return (
    <label>
      {label}
      <input ref={ref} />
    </label>
  );
}
```

`forwardRef` still works in React 19, but react.dev marks it as no longer necessary and announces its deprecation in a future release. A codemod (`npx codemod react/19/remove-forward-ref`) migrates existing components. Class components are different: a ref on a class element still points to the **instance**, never to a `ref` prop.

## Exposing a custom handle

Sometimes you want to expose a few methods instead of the raw DOM node. In classes, the parent gets the instance and calls its methods. In function components, combine the ref prop with `useImperativeHandle`:

```jsx
function VideoPlayer({ ref, src }) {
  const videoRef = useRef(null);
  useImperativeHandle(ref, () => ({
    play: () => videoRef.current.play(),
  }));
  return <video ref={videoRef} src={src} />;
}
```

## Pitfalls

- Reading `ref.current` during render: it is `null` on the first render and not reactive. Read it in effects, lifecycle methods or event handlers.
- `createRef()` in a function component body returns a fresh, empty ref each render.
- Wrapping a component in `forwardRef` **and** reading `props.ref`: with `forwardRef` the ref arrives only as the second argument.
- Refs are an escape hatch. Prefer props and state; use refs for focus, text selection, measuring, media playback and integrating non-React libraries.
