Wrap the cart team's React widget in a **custom element**, so any host (React, Vue, Angular, server-rendered HTML) can use it as `<cart-summary count="3">` and listen to a DOM event, without sharing a framework.

**`cart-summary.jsx`**

- `CartSummary({ count, onCheckout })` (done): renders `Items in cart: {count}` in a `<p>` and a `Checkout` button.
- `class CartSummaryElement extends HTMLElement`:
  - `static observedAttributes` includes `'count'`.
  - `connectedCallback()`: creates a React root **on the element itself** (light DOM, `createRoot(this)`) the first time, and renders `<CartSummary>` with the numeric value of the `count` attribute (`0` when missing).
  - `attributeChangedCallback()`: renders again with the new count (once the root exists).
  - `disconnectedCallback()`: unmounts the root and forgets it. Defer it with `queueMicrotask` and skip it when the element is connected again by then (a move, not a removal). Unmounting synchronously while a React host is committing logs a React error, which the tests treat as a failure.
  - Clicking `Checkout` dispatches, from the element, `new CustomEvent('cart:checkout', { bubbles: true, composed: true, detail: { count } })`.
  - Do not define a `count` property on the class: React 19 assigns a prop as a property when the element has one, and the tests expect the attribute.
- `defineCartSummary(tagName = 'cart-summary')`: defines `tagName` as `CartSummaryElement`, only if `customElements.get(tagName)` is empty (a name can be defined once per page).

**`App.jsx`** (React host): `Add item` increments `count`; it renders `<cart-summary count={count}>` and, when `cart:checkout` arrives, shows `Checked out {count} items` in the `<p role="status">`. In React 19 you can listen with the prop `oncart:checkout={handler}`, or with a ref and `addEventListener`.

The tests define fresh subclasses of `CartSummaryElement` under unique tag names, so they always run your latest code. The preview cannot redefine `<cart-summary>` after the first run: reload the page to see class changes there.
