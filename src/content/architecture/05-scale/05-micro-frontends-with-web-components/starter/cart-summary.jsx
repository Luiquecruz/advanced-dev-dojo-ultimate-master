import { createRoot } from 'react-dom/client';

export function CartSummary({ count, onCheckout }) {
  return (
    <div className="cart-summary">
      <p>Items in cart: {count}</p>
      <button type="button" onClick={onCheckout}>
        Checkout
      </button>
    </div>
  );
}

export class CartSummaryElement extends HTMLElement {
  // TODO: declare static observedAttributes so the browser reports changes of 'count'

  connectedCallback() {
    // TODO: create a React root on this element (once) and render <CartSummary> with the current count
  }

  attributeChangedCallback() {
    // TODO: render again with the new count, if the root exists
  }

  disconnectedCallback() {
    // TODO: unmount the React root, deferred with queueMicrotask and only if the element is still disconnected
  }

  checkout() {
    // TODO: dispatch a 'cart:checkout' CustomEvent that bubbles, is composed and carries detail: { count }
  }
}

export function defineCartSummary(tagName = 'cart-summary') {
  // TODO: define tagName as CartSummaryElement, only when it is not defined yet
}
