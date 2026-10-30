## The browser as the integration contract

Micro-frontends need a contract that every team can implement and every host can consume, whatever framework each side uses. **Web Components** give you one that is built into the platform: a team ships a **custom element**, and hosts use it like any HTML tag.

```html
<cart-summary count="3"></cart-summary>
<script>
  document.addEventListener('cart:checkout', (event) => console.log(event.detail.count));
</script>
```

Inputs are **attributes** (strings) and **properties** (any value); outputs are **DOM events**. The framework inside is an implementation detail: the cart team can render with React today and switch tomorrow without any host noticing.

## The custom element lifecycle

```jsx
class CartSummaryElement extends HTMLElement {
  static observedAttributes = ['count'];

  connectedCallback() {}                                   // inserted into the document
  attributeChangedCallback(name, oldValue, newValue) {}    // an observed attribute changed
  disconnectedCallback() {}                                // removed from the document
}

customElements.define('cart-summary', CartSummaryElement);
```

- Tag names must contain a hyphen and can be **defined only once per page**. Guard with `customElements.get(name)` when a bundle might load twice.
- `attributeChangedCallback` only fires for names listed in `observedAttributes`.
- An element can be disconnected and connected again (moved in the DOM), so callbacks must be safe to run several times.

## React inside a custom element

The element owns one React root and maps its lifecycle onto it:

```jsx
connectedCallback() {
  this.root ??= createRoot(this);
  this.renderView();
}

disconnectedCallback() {
  queueMicrotask(() => {
    if (this.isConnected || !this.root) return;
    this.root.unmount();
    this.root = null;
  });
}
```

The deferral matters: when a React host removes the element, it does so during its commit phase, and unmounting a root synchronously at that moment makes React log an error. Waiting for a microtask also lets a move (disconnect followed by connect) keep the same root.

Outputs leave as events dispatched from the element:

```js
this.dispatchEvent(new CustomEvent('cart:checkout', {
  bubbles: true,
  composed: true,
  detail: { count },
}));
```

`bubbles` lets any ancestor listen; `composed` lets the event cross Shadow DOM boundaries. Namespacing names (`cart:checkout`) avoids collisions with native events and other teams.

## React 19 as a host

React 19 fully supports custom elements:

- A prop becomes a **property** when the element defines one with that name (`'items' in element`), otherwise an **attribute**. Rich data (arrays, objects) should be properties; simple values can be attributes.
- An `on…` prop with a function adds an event listener named after the rest of the prop: `oncart:checkout={handler}` listens to `cart:checkout`.

React 18 and earlier stringified every prop into an attribute and ignored custom events, which forced the classic workaround still useful today:

```jsx
const ref = useRef(null);
useEffect(() => {
  const element = ref.current;
  element.addEventListener('cart:checkout', handleCheckout);
  return () => element.removeEventListener('cart:checkout', handleCheckout);
}, [handleCheckout]);
```

## Shadow DOM: isolation with trade-offs

`this.attachShadow({ mode: 'open' })` and rendering into the shadow root isolate styles in both directions: host CSS does not leak in, the element's CSS does not leak out. The costs: global styles and design tokens must be passed in explicitly (CSS custom properties do inherit through the boundary), some libraries that inject styles into `document.head` stop working, forms and accessibility relations (`aria-labelledby`, `<label for>`) cannot cross the boundary, and tests must query inside `shadowRoot`. Many teams render into the light DOM and scope styles with prefixes or CSS Modules instead.

## Pitfalls

- Forgetting `unmount` on disconnect: the React tree and its effects keep running.
- Defining a property and expecting an attribute (or the opposite): React 19 picks the property when it exists.
- Server rendering: custom elements render as empty tags until JavaScript defines them; Declarative Shadow DOM helps but adds complexity.
- One React copy per element bundle: ten widgets, ten Reacts. Share it through the host or import maps.

## When to choose it

Use Web Components when the hosts are heterogeneous (React, Vue, Angular, CMS pages) or unknown, for embeddable widgets, and for design system primitives shared across stacks. When every app is React and lives in one build, plain components behind a module's public API are simpler; when you need routing-level composition, combine elements with a shell like the one in the previous lesson.
