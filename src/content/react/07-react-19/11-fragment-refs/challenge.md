Build a formatting toolbar whose buttons are handled as a group through a **Fragment ref**, without wrapper elements.

1. Export `ButtonGroup({ onPress, autoFocus = false, children })`:
   - Renders `<Fragment ref={...}>{children}</Fragment>`, with no extra DOM element.
   - In an effect, adds a `click` listener with `fragment.addEventListener('click', listener)`. The listener calls `onPress(event.currentTarget.textContent)`.
   - Removes the listener in the effect cleanup, so a new `onPress` replaces the old one instead of adding a second listener.
   - When `autoFocus` is true, calls `fragment.focus()` on mount to focus the first button.
2. The default export `Toolbar({ onPress, autoFocus })` renders `<div role="toolbar" aria-label="Formatting">` containing a `ButtonGroup` with three buttons: `Bold`, `Italic`, `Underline`.

The buttons must be direct children of the toolbar `<div>`.
