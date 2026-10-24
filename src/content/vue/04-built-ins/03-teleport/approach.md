1. Declare the `close` event.
2. Wrap the markup in `<Teleport to="body">` and render the backdrop only when `open`.
3. Emit `close` from the button, the Escape key handler and a `.self` click handler on the backdrop.
4. Open the dialog in the preview and inspect the DOM: it lives directly under `<body>`.
