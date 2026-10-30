export const FREE_SHIPPING_THRESHOLD = 100;
export const SHIPPING_FEE = 10;

export function createOrder(items) {
  if (items.length === 0) {
    throw new Error('An order needs at least one item');
  }
  if (items.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1)) {
    throw new Error('Quantities must be positive integers');
  }
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  return { items: items.map((item) => ({ ...item })), subtotal, shipping, total: subtotal + shipping };
}
