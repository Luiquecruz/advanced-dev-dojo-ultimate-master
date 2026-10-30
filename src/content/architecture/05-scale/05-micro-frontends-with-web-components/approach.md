1. Treat the custom element as the public contract: a tag name, attributes going in, DOM events coming out. The React component inside is a private implementation detail the host never sees.
2. Map the element lifecycle to the React root lifecycle: create the root when connected, render on every observed attribute change, unmount when disconnected.
3. Convert inputs at the boundary: attributes are strings, so parse `count` into a number before it reaches the component.
4. Defer the unmount to a microtask. A React host removes the element during its commit phase, and unmounting another root synchronously there is an error. Checking `isConnected` in the microtask also turns a DOM move into a no-op.
5. Emit outputs as a `CustomEvent` dispatched from the element, with `bubbles` so ancestors can listen and `composed` so it crosses Shadow DOM boundaries if the element or its host ever uses one.
6. Guard the registration with `customElements.get`, because a tag can be defined only once per page and bundles may be evaluated twice.
7. In the React host, pass data as an attribute and subscribe to the event with React 19's `on<event>` prop or a ref plus `addEventListener`.
