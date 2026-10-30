On the server, `renderToString(<Component {...props} />)` gives the island's inner HTML. The marker is a template string: `` `<div data-island="${name}" data-props="${escapeAttribute(JSON.stringify(props))}">${html}</div>` ``.
---
On the client, `root.querySelectorAll('[data-island]')` returns the markers. `element.dataset.island` and `element.dataset.props` read the attributes, already unescaped by the browser.
---
Check every name first (`islands.find((island) => !components[island.dataset.island])`) and throw, then `map` the islands to `hydrateRoot(island, <Component {...JSON.parse(island.dataset.props)} />)`. Hydrating the island element itself, never `root`, is what keeps the static HTML untouched.
