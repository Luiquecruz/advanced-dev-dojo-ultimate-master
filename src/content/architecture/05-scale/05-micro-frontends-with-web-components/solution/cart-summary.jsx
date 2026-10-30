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
  static observedAttributes = ['count'];

  connectedCallback() {
    this.root ??= createRoot(this);
    this.renderView();
  }

  attributeChangedCallback() {
    if (this.root) this.renderView();
  }

  disconnectedCallback() {
    queueMicrotask(() => {
      if (this.isConnected || !this.root) return;
      this.root.unmount();
      this.root = null;
    });
  }

  readCount() {
    return Number(this.getAttribute('count') ?? 0);
  }

  renderView() {
    this.root.render(<CartSummary count={this.readCount()} onCheckout={() => this.checkout()} />);
  }

  checkout() {
    this.dispatchEvent(
      new CustomEvent('cart:checkout', { bubbles: true, composed: true, detail: { count: this.readCount() } }),
    );
  }
}

export function defineCartSummary(tagName = 'cart-summary') {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, CartSummaryElement);
  }
}
