A ref can be a function: `<input ref={(node) => node?.focus()} />`. React calls it with the DOM node when it is attached.
---
Inside `map`, give each `<li>` its own callback: `ref={(node) => { registry.set(contact.id, node); ... }}`. You cannot call `useRef` in a loop, but you can create functions.
---
Return the cleanup from the same callback: `return () => { registry.delete(contact.id); };`. In `App`, render a `<label>` containing a controlled checkbox and the text `Show search`, then `{showSearch && <AutoFocusInput label="Search" />}`.
