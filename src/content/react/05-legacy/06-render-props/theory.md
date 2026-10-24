## Passing a function that renders

A **render prop** is a prop whose value is a function that returns JSX. The component owns some logic or state, and lets the caller decide **what to render** with it.

```jsx
function MouseTracker({ render }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  return (
    <div onMouseMove={(event) => setPosition({ x: event.clientX, y: event.clientY })}>
      {render(position)}
    </div>
  );
}

<MouseTracker render={({ x, y }) => <p>The pointer is at {x}, {y}</p>} />;
```

The same tracker can drive a tooltip, a crosshair or a debug overlay, because the rendering is delegated. The prop does not have to be called `render`: any function prop that returns elements qualifies.

## Children as a function

The most popular variant uses `children` itself as the function. It reads nicely in JSX:

```jsx
<Toggle>
  {({ on, toggle }) => (
    <button onClick={toggle}>{on ? 'Hide' : 'Show'}</button>
  )}
</Toggle>
```

```jsx
function Toggle({ initialOn = false, children }) {
  const [on, setOn] = useState(initialOn);
  const toggle = () => setOn((current) => !current);
  return children({ on, toggle });
}
```

Libraries built entire APIs on this idea: React Motion, Downshift, Formik's `<Formik>{(formik) => ...}</Formik>`, React Router v4's `<Route render>` and the original Context API, `<ThemeContext.Consumer>{(theme) => ...}</ThemeContext.Consumer>`.

## Why render props appeared

Mixins were deprecated and HOCs had problems: unclear prop origins, name collisions and static composition at module level. Render props fixed several of them:

- **Explicit data flow**: you see exactly which values you receive, and you name them yourself.
- **Dynamic composition**: the function runs during render, so it can use props and state of the caller.
- **No prop collisions**: nothing is injected implicitly.

## Their own problems

- **Callback pyramids**: nesting three providers gives the "render props hell" indentation:

```jsx
<Theme>{(theme) => (
  <User>{(user) => (
    <Mouse>{(mouse) => <Dashboard theme={theme} user={user} mouse={mouse} />}</Mouse>
  )}</User>
)}</Theme>
```

- **New function every render**: an inline function defeats `PureComponent`/`memo` on the component receiving it.
- **Logic only usable in JSX**: you cannot use the value in an effect of the caller without passing it down again.

## Legacy vs modern: custom hooks

Hooks give the same reuse with plain function calls, no nesting:

```jsx
function useToggle(initialOn = false) {
  const [on, setOn] = useState(initialOn);
  const toggle = () => setOn((current) => !current);
  return { on, toggle };
}

function Details() {
  const { on, toggle } = useToggle();
  const theme = useTheme();
  const user = useUser();
  // flat, explicit, usable everywhere in the component
}
```

A neat migration path: write the hook first and implement the render-prop component on top of it, so old call sites keep working while new code calls the hook directly.

```jsx
function Toggle({ initialOn, children }) {
  return children(useToggle(initialOn));
}
```

## When render props are still the right tool

Render props remain idiomatic when the component must **control where** the caller's output goes in its own markup: virtualized lists (`renderItem`), tables (`renderCell`), comboboxes (`renderOption`), animation libraries that hand you interpolated styles. If the caller only needs data, prefer a hook.

## Pitfalls

- Forgetting to **call** the function: `{children}` instead of `{children(state)}` renders nothing and React warns that functions are not valid as a child.
- Doing heavy work inside the inline function on every render.
- Mixing `render` and `children` props in the same component API without documenting which wins.
