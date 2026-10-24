Build a modal that renders through a portal.

1. **`export function Modal({ open, title, onClose, children })`**
   - Renders nothing when `open` is `false`.
   - When open, uses **`createPortal`** (from `react-dom`) to render into **`document.body`** a `<div role="dialog" aria-modal="true" aria-label={title}>` that contains an `<h2>` with the `title`, the `children`, and a `<button>` **`Close`** that calls `onClose`.
2. **`export default function App()`**
   - Keeps an `open` state (initially `false`) and a `clicks` counter.
   - Renders a `<div data-testid="app">` whose `onClick` increments `clicks`, containing:
     - a `<button>` **`Open modal`** that opens the modal,
     - a `<p>` with `Clicks inside app: {clicks}`,
     - `<Modal open={open} title="Settings" onClose={...}>` with a `<p>` `Portal content` inside.

Clicks inside the modal must still bubble to the app `div` through the React tree, even though the dialog is not inside it in the DOM.
