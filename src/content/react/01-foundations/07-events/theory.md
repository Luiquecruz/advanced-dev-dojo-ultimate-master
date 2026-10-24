## Event handlers

React attaches event handlers through camelCase props such as `onClick`, `onChange`, `onSubmit`, `onKeyDown` or `onPointerEnter`. You pass a **function**; React calls it when the event happens.

```jsx
function SaveButton() {
  function handleClick() {
    console.log('Saved!');
  }
  return <button onClick={handleClick}>Save</button>;
}
```

Handlers are defined inside the component, so they can read props and state. By convention they are named `handleSomething`, and props that receive handlers are named `onSomething`.

## Pass the function, do not call it

```jsx
<button onClick={handleClick}>       // ✅ passes the function
<button onClick={handleClick()}>     // 🔴 calls it during render
<button onClick={() => remove(id)}>  // ✅ inline arrow when you need arguments
```

`handleClick()` runs while React renders, and its *return value* becomes the handler. If it updates state you even get an infinite render loop. Whenever you need to pass arguments, wrap the call in an arrow function.

## Handlers as props

Components expose their events through props, which keeps them reusable:

```jsx
function Toolbar({ onPlay, onUpload }) {
  return (
    <>
      <button onClick={onPlay}>Play</button>
      <button onClick={onUpload}>Upload</button>
    </>
  );
}

<Toolbar onPlay={() => player.play()} onUpload={openDialog} />
```

The child decides *when*; the parent decides *what*.

## The event object

Handlers receive a **synthetic event**, a cross-browser wrapper with the same interface as the native one (`target`, `currentTarget`, `key`, `preventDefault()`, `stopPropagation()`). The native event is available as `event.nativeEvent`.

### Propagation

Events **bubble** from the target up through its ancestors, React handlers included. Call `event.stopPropagation()` to stop it:

```jsx
<div className="card" onClick={openCard}>
  <button onClick={(event) => { event.stopPropagation(); like(); }}>Like</button>
</div>
```

Use the `onClickCapture` variant to handle an event during the capture phase, before children see it.

### Default behavior

Some events have browser defaults: a submit reloads the page, a link navigates. `event.preventDefault()` cancels them:

```jsx
function SearchForm({ onSearch }) {
  function handleSubmit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onSearch(String(data.get('query')));
  }
  return (
    <form onSubmit={handleSubmit}>
      <input name="query" />
      <button type="submit">Search</button>
    </form>
  );
}
```

`event.currentTarget` is the element the handler is attached to (the form); `event.target` is the element where the event started (maybe a button inside it). `FormData` reads every named field of a form without extra state.

### Buttons inside forms

A `<button>` inside a `<form>` defaults to `type="submit"`. Any button that should **not** submit needs `type="button"`.

## Legacy vs modern

- React 16 and older pooled synthetic events: the event object was reused after the handler, so accessing it asynchronously required `event.persist()`. Pooling was removed in React 17; `persist()` is now a no-op.
- React 17 moved event listeners from `document` to the **root container**, which makes mixing React versions and non-React code safer.
- Class components bound handlers in the constructor (`this.handleClick = this.handleClick.bind(this)`). Function components do not have this problem.
- React 19 adds **form Actions** (`<form action={fn}>`), covered in the React 19 module. `onSubmit` with `preventDefault` remains the classic pattern.

## Pitfalls

- `onClick={fn()}` instead of `onClick={fn}`.
- Forgetting `type="button"` on secondary form buttons.
- `return false` from a handler does **not** prevent the default in React; call `preventDefault()`.
- Side effects belong in event handlers, not in the render body.
