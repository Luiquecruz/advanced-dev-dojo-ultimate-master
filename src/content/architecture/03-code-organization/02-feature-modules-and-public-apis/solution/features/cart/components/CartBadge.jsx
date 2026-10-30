import { formatPrice } from '../../../shared/lib/formatPrice';
import { useCart } from '../model/CartContext';

export function CartBadge() {
  const { count, total } = useCart();
  return (
    <p data-testid="cart-badge">
      Cart: {count} · {formatPrice(total)}
    </p>
  );
}
