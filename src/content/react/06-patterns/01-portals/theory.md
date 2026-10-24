## Rendering outside the parent DOM node

Normally a component's DOM output is nested inside its parent's DOM node. That is a problem for UI that must **visually escape** its container: modals, tooltips, dropdown menus, toasts. A parent with `overflow: hidden`, `transform` or a low `z-index` stacking context clips or hides them.

A **portal** renders children into a different DOM node while keeping them in the same place in the **React tree**:

```jsx
import { createPortal } from 'react-dom';

function Modal({ children }) {
  return createPortal(
    <div role="dialog" aria-modal="true" className="modal">
      {children}
    </div>,
    document.body,
  );
}
```

`createPortal(children, domNode, key?)` returns a React node you can return from a component or place anywhere in JSX. The `domNode` must already exist (for example `document.body` or a `<div id="modal-root">` in `index.html`).

## DOM position vs React position

This distinction is the heart of portals:

| | Follows the **DOM** tree | Follows the **React** tree |
| --- | --- | --- |
| CSS layout, `overflow`, stacking | ✓ | |
| `document.querySelector` | ✓ | |
| Context values | | ✓ |
| **Event bubbling** (`onClick` on ancestors) | | ✓ |
| State and lifecycle (unmounting with the parent) | | ✓ |

So a click inside a portal bubbles to the `onClick` of React ancestors even though, in the DOM, the modal is a child of `<body>`:

```jsx
<div onClick={() => console.log('caught!')}>
  <Modal>
    <button>Inside the portal</button>
  </Modal>
</div>
```

Clicking the button logs `caught!`. This is usually what you want (a form wrapping the modal still receives events), but it can surprise you: a "close when clicking outside" handler on an ancestor fires for clicks **inside** the modal too. Call `event.stopPropagation()` in the portal when needed.

## A modal, step by step

```jsx
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return createPortal(
    <div className="backdrop">
      <div role="dialog" aria-modal="true" aria-label={title}>
        {children}
        <button onClick={onClose}>Close</button>
      </div>
    </div>,
    document.body,
  );
}
```

The parent owns the `open` state, so the modal is fully controlled.

## Accessibility checklist

Portals solve the visual problem, not accessibility. A real dialog also needs:

- `role="dialog"` and `aria-modal="true"`, labelled by its title.
- Focus moved into the dialog on open and restored to the trigger on close.
- `Escape` to close, and focus trapped inside while open.

The native `<dialog>` element with `showModal()` gives you the top layer, `Escape` handling and inert background for free, and is now a solid alternative for simple modals. Libraries such as Radix UI or React Aria combine portals with all the accessibility details.

## Legacy notes

- Portals arrived in **React 16** (2017). Before that, libraries used `ReactDOM.unstable_renderSubtreeIntoContainer` or rendered a second root with `ReactDOM.render` in `componentDidMount`, which lost context and event bubbling.
- `createPortal` is imported from `react-dom` (not `react-dom/client`) and is still the API in React 19.

## Pitfalls

- Rendering into a node that does not exist yet (`document.getElementById('modal-root')` returning `null`) throws.
- Server rendering: there is no `document` on the server, so render portals only on the client.
- Do not use portals just to avoid writing CSS: they are for content that must break out of its container.
