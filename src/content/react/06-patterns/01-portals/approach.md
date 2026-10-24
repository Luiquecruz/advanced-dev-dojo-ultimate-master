1. In `Modal`, return `null` when `open` is false so nothing is rendered.
2. Wrap the dialog markup in `createPortal(markup, document.body)`. The dialog now lives under `<body>` in the DOM.
3. Keep `role="dialog"`, `aria-modal="true"` and `aria-label={title}` so the dialog has an accessible name.
4. In `App`, add the open button, the counter paragraph and the `Modal` inside the app `div`.
5. Notice you do not need any extra code for bubbling: React dispatches events along the React tree, so the app `div` still sees clicks from the portal.
