export function createPlaceOrder(orderGateway) {
  return async function placeOrder(items) {
    // TODO: build the order with createOrder from the domain and save it through the port: orderGateway.save(order) resolves to { id }
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, subtotal }),
    });
    const { id } = await response.json();
    return { items, subtotal, shipping: 0, total: subtotal, id };
  };
}
