Return `null` early when `open` is false. Otherwise return `createPortal(jsx, document.body)` instead of the JSX directly.
---
`createPortal` takes two arguments: the React node to render and the DOM node to render it into. Wrap the existing dialog markup with it.
---
In `App`, render `<button onClick={() => setOpen(true)}>Open modal</button>`, `<p>Clicks inside app: {clicks}</p>` and `<Modal open={open} title="Settings" onClose={() => setOpen(false)}><p>Portal content</p></Modal>`. Event bubbling through the portal works automatically.
