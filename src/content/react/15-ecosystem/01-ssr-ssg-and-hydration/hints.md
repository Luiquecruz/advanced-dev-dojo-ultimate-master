`renderToString(element)` from `react-dom/server` returns a string. Pass it `<App initialCount={initialCount} />`.
---
`createRoot().render()` builds a brand-new DOM. `hydrateRoot(container, element)` from `react-dom/client` adopts the existing DOM instead, and it returns the root object.
---
`Math.random()` gives the server and the client different ids. `const stepId = useId();` returns the same value on both sides because it is derived from the component's position in the tree.
