import { useCart } from '../model/CartContext';

// TODO: this helper is duplicated in the catalog feature: move it to shared/lib/formatPrice.js and import it from there
function formatPrice(amount) {
  return `$${amount.toFixed(2)}`;
}

export function CartBadge() {
  const { count, total } = useCart();
  return (
    <p data-testid="cart-badge">
      Cart: {count} · {formatPrice(total)}
    </p>
  );
}
