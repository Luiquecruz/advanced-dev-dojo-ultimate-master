The browser drives the lifecycle: `connectedCallback` when the element enters the document, `attributeChangedCallback(name, oldValue, newValue)` for every attribute listed in `static observedAttributes = ['count']`, and `disconnectedCallback` when it leaves. React is just what you call from those hooks.
---
Keep the root on the instance: `this.root ??= createRoot(this);` in `connectedCallback`, then a `renderView()` method calling `this.root.render(<CartSummary count={...} onCheckout={() => this.checkout()} />)`. Read the count with `Number(this.getAttribute('count') ?? 0)`; attributes are always strings.
---
In `disconnectedCallback`: `queueMicrotask(() => { if (this.isConnected || !this.root) return; this.root.unmount(); this.root = null; })`. In `checkout()`: `this.dispatchEvent(new CustomEvent('cart:checkout', { bubbles: true, composed: true, detail: { count } }))`.
---
In the host, React 19 turns an `on…` prop on a custom element into an event listener named after the rest of the prop: `<cart-summary count={count} oncart:checkout={(event) => setMessage(...)} />`.
