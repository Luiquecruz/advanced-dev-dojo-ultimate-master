export const FREE_SHIPPING_THRESHOLD = 100;
export const SHIPPING_FEE = 10;

export function createOrder(items) {
  // TODO: reject an empty list ('An order needs at least one item') and quantities that are not positive integers
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  // TODO: shipping is free from FREE_SHIPPING_THRESHOLD on, otherwise SHIPPING_FEE; total = subtotal + shipping
  return { items, subtotal, shipping: 0, total: subtotal };
}
