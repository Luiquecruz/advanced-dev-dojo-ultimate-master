import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useSnapshot } from 'valtio';
import { createCartStore } from './cartStore';
import { createWishlist, toggleSaved } from './wishlist';

export const products = [
  { id: 1, name: 'Keyboard', price: 120 },
  { id: 2, name: 'Mouse', price: 45 },
  { id: 3, name: 'Monitor', price: 340 },
];

// TODO: bug — the summary never updates after the first render. Make it react to the MobX store
export function CartSummary({ cart }) {
  return (
    <aside>
      <p data-testid="cart-count">Items: {cart.count}</p>
      <p data-testid="cart-total">Total: ${cart.total}</p>
      <ul>
        {cart.items.map((item) => (
          <li key={item.id}>
            {item.name} x {item.quantity}
            <button onClick={() => cart.remove(item.id)}>Remove {item.name}</button>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export function SaveButton({ wishlist, product }) {
  const snap = useSnapshot(wishlist);
  const saved = snap.ids.includes(product.id);
  return (
    // TODO: bug — clicking throws. Snapshots are frozen: which object should be mutated?
    <button aria-pressed={saved} onClick={() => toggleSaved(snap, product.id)}>
      Save {product.name}
    </button>
  );
}

export function WishlistCount({ wishlist }) {
  // TODO: bug — the count never re-renders. Read from a snapshot instead of the proxy
  return <p data-testid="saved-count">Saved: {wishlist.ids.length}</p>;
}

export function Shop({ cart, wishlist }) {
  return (
    <main>
      <ul>
        {products.map((product) => (
          <li key={product.id}>
            {product.name} (${product.price})
            <button onClick={() => cart.add(product)}>Add {product.name}</button>
            <SaveButton wishlist={wishlist} product={product} />
          </li>
        ))}
      </ul>
      <WishlistCount wishlist={wishlist} />
      <CartSummary cart={cart} />
    </main>
  );
}

export default function App() {
  const [cart] = useState(createCartStore);
  const [wishlist] = useState(createWishlist);
  return <Shop cart={cart} wishlist={wishlist} />;
}
