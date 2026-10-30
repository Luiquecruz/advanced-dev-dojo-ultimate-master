`useSyncExternalStore(subscribe, getSnapshot)` needs a `subscribe(onChange)` that adds listeners and returns a cleanup, and a `getSnapshot` that returns `window.location.pathname` (a string, so it is stable between calls).
---
`pushState` is silent. After `window.history.pushState(null, '', path)`, dispatch your own event (for example `window.dispatchEvent(new Event('navigate'))`) and listen to it in `subscribe` next to `'popstate'`.
---
In `Link`, return early when `event.defaultPrevented`, `event.button !== 0`, or any of `metaKey`, `ctrlKey`, `shiftKey`, `altKey` is set. Otherwise call `event.preventDefault()` and `navigate(to)`. In `Products`, keep `products` in state starting at `null` and render `Loading…` while it is `null`.
