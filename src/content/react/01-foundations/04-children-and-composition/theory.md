## The `children` prop

Whatever you nest between a component's opening and closing tags arrives in the special prop **`children`**:

```jsx
function Card({ children }) {
  return <div className="card">{children}</div>;
}

<Card>
  <h2>Ada Lovelace</h2>
  <p>First programmer.</p>
</Card>
```

`Card` does not need to know what it wraps. It is a **container**: it provides structure and style, and the parent decides the content. This is how you build panels, modals, layouts, buttons with icons and every other "box" in a design system.

`children` can be anything renderable: a string, a single element, an array, `null`, or a mix. Treat it as an **opaque** value and just render it.

## Composition instead of inheritance

In class-based UI toolkits you might create `class FancyCard extends Card`. React never uses inheritance between components. You **compose** them instead:

```jsx
function WelcomeCard() {
  return (
    <Card>
      <h2>Welcome!</h2>
      <Button>Get started</Button>
    </Card>
  );
}
```

Specialization is "a component that renders a more generic one with specific props or children".

## Multiple slots: JSX as props

`children` is just one prop. When a component needs **several** holes to fill, pass JSX through other props. Vue and Angular call these *named slots*; in React they are plain props:

```jsx
function Layout({ header, sidebar, children }) {
  return (
    <div className="layout">
      <header>{header}</header>
      <aside>{sidebar}</aside>
      <main>{children}</main>
    </div>
  );
}

<Layout header={<Logo />} sidebar={<Nav />}>
  <Dashboard />
</Layout>
```

## Composition avoids prop drilling

Composition is also the first tool against **prop drilling** (passing a value through many components that do not use it). Instead of passing `user` through `Layout` → `Sidebar` → `UserMenu`, render `<UserMenu user={user} />` at the top and pass the element down as `sidebar`. Only reach for Context when composition is not enough.

## Fragments

To return several siblings without an extra DOM wrapper, use a **Fragment**:

```jsx
function Columns() {
  return (
    <>
      <td>Name</td>
      <td>Role</td>
    </>
  );
}
```

The long form `<Fragment key={id}>` (imported from `react`) is needed when the fragment is inside a list and requires a `key`.

## Legacy: React.Children and cloneElement

Older libraries inspected and modified children with `React.Children.map`, `React.Children.count` and `cloneElement`:

```jsx
React.Children.map(children, (child) => cloneElement(child, { size: 'small' }));
```

These APIs still exist but are listed as **legacy** in the React docs: they are fragile (they break when a child is wrapped in another component or a Fragment) and hide data flow. Prefer explicit props, render props, or context for compound components.

## Pitfalls

- Forgetting to render `{children}` silently drops everything the parent nested.
- Passing a component instead of an element: `sidebar={Nav}` passes the function; `sidebar={<Nav />}` passes the element to render.
- Wrapping everything in `<div>` breaks layouts like tables or flex/grid containers. Use Fragments when the wrapper has no purpose.
