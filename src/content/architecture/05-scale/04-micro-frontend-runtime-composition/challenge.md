Build the **shell** that composes independently deployed micro-frontends in the browser. Each micro-frontend follows a framework-agnostic lifecycle contract:

```js
const microFrontend = await load();               // e.g. a remote bundle
const unmount = microFrontend.mount(element, { path });
unmount();                                        // remove everything it rendered
```

**Done for you**

- `microfrontends/profile.jsx`: a React micro-frontend (`createRoot` in `mount`, `root.unmount()` in the returned function). Its `Go to checkout` button dispatches `new CustomEvent('mfe:navigate', { detail: { path: '/checkout' } })` on `window`.
- `microfrontends/checkout.js`: a plain DOM micro-frontend with a `Checkout` heading and a `Back to profile` button using the same event.
- `App.jsx`: the preview host that registers both (plus a `broken` one) and navigates through the event.

**Your task**: implement `createShell(container)` in `shell.js`, returning:

- `register(name, { route, load })`: stores the micro-frontend. `load()` returns a promise of `{ mount(element, props) → unmount }`.
- `navigate(path)` (async, never rejects):
  1. calls the `unmount` returned by the currently mounted micro-frontend and empties `container`;
  2. picks the registration whose `route` equals `path` or prefixes it followed by `/` (`/orders` matches `/orders/42`);
  3. appends a `<section data-micro-frontend="<name>">` to `container`;
  4. calls `load()` **once per micro-frontend** (cache it and reuse it on later visits), then `mount(section, { path })`, keeping the returned `unmount`;
  5. if `load()` rejects or `mount` throws, renders `<p role="alert">Failed to load <name></p>` inside the section. The shell keeps working for the next navigation.
- Forwards every `window` `CustomEvent` named `mfe:navigate` to `navigate(event.detail.path)`.
- `destroy()`: stops listening to `mfe:navigate` and unmounts the current micro-frontend, leaving `container` empty.
