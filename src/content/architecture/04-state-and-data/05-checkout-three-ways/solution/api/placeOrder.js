export const ORDERS_ENDPOINT = '/api/orders';

export async function placeOrder(order) {
  const response = await fetch(ORDERS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order),
  });
  if (!response.ok) {
    throw new Error(`Order failed: ${response.status}`);
  }
  return response.json();
}
